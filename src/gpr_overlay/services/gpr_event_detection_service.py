from typing import List, Optional
from datetime import date
import logging

import numpy as np
import pandas as pd

from gpr_overlay.data_models.gpr_series import GprDailyPoint
from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType

logger = logging.getLogger(__name__)


# Constants / thresholds
Z_THRESHOLD = 2.0
LOCAL_MAX_WINDOW = 3  # days on each side
MIN_EPISODE_DAYS = 10
EPISODE_PERCENTILE = 0.80  # 80th percentile
MIN_REGIME_DAYS = 60
REGIME_PERCENTILE = 0.75   # 75th percentile

# New quantile-based spike taxonomy (production defaults)
ELEVATED_SPIKE_Q = 0.99
EXTREME_SPIKE_Q = 0.995
BUFFER_PRE_DAYS_DEFAULT = 7
BUFFER_POST_DAYS_DEFAULT = 2


def detect_gpr_events(points: List[GprDailyPoint], include_regimes: bool = False) -> List[GprEvent]:
    """
    Detect short-term spikes in a sequence of GprDailyPoint.

    Args:
        points: List of GprDailyPoint observations.
        include_regimes: If True, also detect episodes and regimes. Default False (spike-only).

    The algorithm is deliberately simple and explainable. By default, this returns
    ONLY spikes for clean, actionable event detection (suitable for publication).
    """
    if not points:
        return []

    df = _points_to_dataframe(points)

    # Primary production detector: quantile-based per-day spikes
    quantile_spikes = _detect_quantile_spikes(df, buffer_pre_days=BUFFER_PRE_DAYS_DEFAULT, buffer_post_days=BUFFER_POST_DAYS_DEFAULT)

    # Spike detection (always run)
    short_term_events = _detect_short_term_spikes(df)

    # Only detect episodes and regimes if explicitly requested
    episode_events = []
    regime_events = []
    if include_regimes:
        episode_events = _detect_episodes(df)
        regime_events = _detect_regimes(df)

    # Combine: quantile spikes first, then short-term spikes, then optional episodes/regimes
    events = quantile_spikes + short_term_events + episode_events + regime_events

    events.sort(key=lambda e: (e.peak_date, e.event_type.value))
    logger.info("Detected %d GPR events (%d quantile spikes, %d short-term spikes, %d episodes, %d regimes)",
                len(events),
                len(quantile_spikes),
                len(short_term_events),
                len(episode_events),
                len(regime_events))

    return events


def select_event_for_target_date(events: List[GprEvent], target_date: date) -> Optional[GprEvent]:
    """Select the GprEvent most relevant to the given target_date.

    Priority:
    1) Filter to SPIKE events only (EXTREME_SPIKE, ELEVATED_SPIKE). Regimes/Episodes are deprioritized.
    2) Among spikes, find those where start_date <= target_date <= end_date.
    3) If multiple spikes contain target_date, pick the one with the highest severity_score
       (tie-breaker: closest peak_date to target_date).
    4) If no spike contains target_date, find the spike whose peak_date is closest to target_date.
    5) If no spikes exist, fall back to closest event by peak_date (any type).
    6) If the events list is empty, return None.
    """
    if not events:
        return None

    # Filter to spike events (EXTREME_SPIKE, ELEVATED_SPIKE) first
    spike_types = {GprEventType.EXTREME_SPIKE, GprEventType.ELEVATED_SPIKE}
    spike_events = [e for e in events if e.event_type in spike_types]

    # If no spikes, fall back to all events
    working_events = spike_events if spike_events else events

    # Look for events containing target_date
    contained = []
    for e in working_events:
        e_start = e.start_date
        e_end = e.end_date if e.end_date is not None else e.start_date
        if e_start <= target_date <= e_end:
            contained.append(e)

    if contained:
        # Pick highest severity, tie-breaker: closest peak_date to target_date
        contained.sort(
            key=lambda x: (
                -(float(x.severity_score) if x.severity_score is not None else 0.0),
                abs((x.peak_date - target_date).days),
            )
        )
        return contained[0]

    # Otherwise find event with minimal absolute distance to target_date by peak_date
    def abs_days(e: GprEvent) -> int:
        return abs((e.peak_date - target_date).days)

    working_events_sorted = sorted(working_events, key=lambda x: (abs_days(x), x.peak_date))
    return working_events_sorted[0]


def _points_to_dataframe(points: List[GprDailyPoint]) -> pd.DataFrame:
    """
    Convert list of GprDailyPoint into a pandas DataFrame with
    columns: date, gprd, gprd_ma7, gprd_ma30.

    If gprd_ma7 or gprd_ma30 are missing in the data, compute them using
    rolling means on gprd (window 7 and 30 respectively).
    """
    records = []
    for p in points:
        records.append({
            "date": pd.to_datetime(p.date),
            "gprd": float(p.gprd),
            "gprd_ma7": float(p.gprd_ma7) if p.gprd_ma7 is not None else np.nan,
            "gprd_ma30": float(p.gprd_ma30) if p.gprd_ma30 is not None else np.nan,
        })

    df = pd.DataFrame.from_records(records).sort_values("date").reset_index(drop=True)

    # Ensure datetime
    df["date"] = pd.to_datetime(df["date"])

    # Compute moving averages if missing
    if df["gprd_ma7"].isna().any():
        df["gprd_ma7"] = df["gprd"].rolling(window=7, min_periods=1).mean()

    if df["gprd_ma30"].isna().any():
        df["gprd_ma30"] = df["gprd"].rolling(window=30, min_periods=1).mean()

    return df


def _percentile_of(value: float, series: pd.Series) -> float:
    """Return simple percentile (0.0-1.0) of value within series (including equals)."""
    arr = series.dropna().values
    if arr.size == 0:
        return 0.0
    # fraction of values <= value
    frac = float((arr <= value).sum()) / float(arr.size)
    return frac


def _detect_quantile_spikes(df: pd.DataFrame, buffer_pre_days: int = BUFFER_PRE_DAYS_DEFAULT, buffer_post_days: int = BUFFER_POST_DAYS_DEFAULT) -> List[GprEvent]:
    """Detect per-day quantile spikes against the full-history GPR distribution.

    For each day t, compute percentile = fraction of historical gprd values <= gprd[t].
    If percentile >= EXTREME_SPIKE_Q -> extreme_spike; elif >= ELEVATED_SPIKE_Q -> elevated_spike.
    Each qualifying day emits one GprEvent with start/end derived from buffers.
    """
    events: List[GprEvent] = []

    g = df["gprd"]
    full_vals = g.dropna().values
    if full_vals.size == 0:
        return events

    for i in range(len(df)):
        val = g.iat[i]
        if pd.isna(val):
            continue

        pct = _percentile_of(val, g)

        if pct >= EXTREME_SPIKE_Q:
            ev_type = GprEventType.EXTREME_SPIKE
            label = "Extreme spike"
        elif pct >= ELEVATED_SPIKE_Q:
            ev_type = GprEventType.ELEVATED_SPIKE
            label = "Elevated spike"
        else:
            continue

        peak_date = df["date"].iat[i].date()
        start_date = (df["date"].iat[i] - pd.Timedelta(days=buffer_pre_days)).date()
        end_date = (df["date"].iat[i] + pd.Timedelta(days=buffer_post_days)).date()

        # severity_score: map percentile to [0,1] in a simple way (e.g., linear above elevated threshold)
        # severity = min(max((pct - ELEVATED_SPIKE_Q) / (1.0 - ELEVATED_SPIKE_Q), 0.0), 1.0)
        # but to keep some continuity use pct directly as severity
        severity = float(min(max(pct, 0.0), 1.0))

        ev = GprEvent(
            event_id=f"quantile-spike-{peak_date.isoformat()}",
            event_type=ev_type,
            start_date=start_date,
            end_date=end_date,
            peak_date=peak_date,
            gpr_level_at_peak=float(val),
            gpr_delta_from_baseline=float(val - float(np.nanmedian(full_vals))) if full_vals.size > 0 else 0.0,
            severity_score=severity,
            percentile=float(pct),
            label=label,
        )
        events.append(ev)

    return events


def _detect_short_term_spikes(df: pd.DataFrame) -> List[GprEvent]:
    """Detect short-term spikes using z-score on 30-day rolling window.
    
    Each spike is assigned a standard temporal window:
    - start_date = peak_date - 7 days
    - end_date = peak_date + 2 days
    
    This ensures consistent event framing for publication.
    """
    events: List[GprEvent] = []

    g = df["gprd"]
    mu_30 = g.rolling(window=30, min_periods=30).mean()
    sigma_30 = g.rolling(window=30, min_periods=30).std()

    full_vals = g.dropna()

    for i in range(len(df)):
        if pd.isna(mu_30.iat[i]) or pd.isna(sigma_30.iat[i]) or sigma_30.iat[i] == 0:
            continue

        val = g.iat[i]
        z = (val - mu_30.iat[i]) / sigma_30.iat[i]
        if z < Z_THRESHOLD:
            continue

        # local maximum check
        left = max(0, i - LOCAL_MAX_WINDOW)
        right = min(len(df) - 1, i + LOCAL_MAX_WINDOW)
        window_max = g.iloc[left:right + 1].max()
        if val < window_max:
            continue

        peak_date = df["date"].iat[i].date()
        # Standard event window for publication
        start_date = (df["date"].iat[i] - pd.Timedelta(days=7)).date()
        end_date = (df["date"].iat[i] + pd.Timedelta(days=2)).date()
        
        baseline = float(mu_30.iat[i])
        delta = float(val - baseline)
        percentile = _percentile_of(val, full_vals)
        severity = float(min(max(z / 5.0, 0.0), 1.0))

        ev = GprEvent(
            event_id=f"spike-{peak_date.isoformat()}",
            event_type=GprEventType.SHORT_TERM_SPIKE,
            start_date=start_date,
            end_date=end_date,
            peak_date=peak_date,
            gpr_level_at_peak=float(val),
            gpr_delta_from_baseline=delta,
            severity_score=severity,
            percentile=percentile,
            label="Short-term spike",
        )
        events.append(ev)

    return events


def _detect_episodes(df: pd.DataFrame) -> List[GprEvent]:
    events: List[GprEvent] = []
    ma7 = df["gprd_ma7"]
    if ma7.dropna().empty:
        return events

    threshold = float(np.nanpercentile(ma7.values, EPISODE_PERCENTILE * 100.0))
    mask = ma7 >= threshold

    # group consecutive True values
    groups = (mask != mask.shift(1)).cumsum()
    full_ma7 = ma7.dropna()
    baseline = float(np.nanmedian(ma7.values))

    for g_id, group_df in df.groupby(groups):
        grp_mask = mask[group_df.index]
        if not grp_mask.any():
            continue
        # consecutive true subgroups within this group
        sub = group_df[grp_mask]
        if sub.empty:
            continue
        length = len(sub)
        if length < MIN_EPISODE_DAYS:
            continue

        start_date = sub["date"].iloc[0].date()
        end_date = sub["date"].iloc[-1].date()

        peak_idx = sub["gprd_ma7"].idxmax()
        peak_date = df.at[peak_idx, "date"].date()
        peak_val = float(df.at[peak_idx, "gprd_ma7"])

        delta = float(peak_val - baseline)
        # simple severity: length * height, normalized to 0-10 range
        raw = float(length * max(peak_val - baseline, 0.0))
        # raw severity metric (unbounded-ish), then scaled to a 0-10 rough score
        raw_severity = min(raw / (10.0 + baseline), 10.0)
        # Normalize severity to [0,1] for system-wide consistency
        severity = float(min(max(raw_severity / 10.0, 0.0), 1.0))
        percentile = _percentile_of(peak_val, full_ma7)

        ev = GprEvent(
            event_id=f"episode-{start_date.isoformat()}-{end_date.isoformat()}",
            event_type=GprEventType.EPISODE,
            start_date=start_date,
            end_date=end_date,
            peak_date=peak_date,
            gpr_level_at_peak=peak_val,
            gpr_delta_from_baseline=delta,
            severity_score=severity,
            percentile=percentile,
            label="Elevated episode",
        )
        events.append(ev)

    return events


def _detect_regimes(df: pd.DataFrame) -> List[GprEvent]:
    events: List[GprEvent] = []
    ma30 = df["gprd_ma30"]
    if ma30.dropna().empty:
        return events

    threshold = float(np.nanpercentile(ma30.values, REGIME_PERCENTILE * 100.0))
    mask = ma30 >= threshold

    groups = (mask != mask.shift(1)).cumsum()
    full_ma30 = ma30.dropna()
    baseline = float(np.nanmedian(ma30.values))

    for g_id, group_df in df.groupby(groups):
        grp_mask = mask[group_df.index]
        if not grp_mask.any():
            continue
        sub = group_df[grp_mask]
        if sub.empty:
            continue
        length = len(sub)
        if length < MIN_REGIME_DAYS:
            continue

        start_date = sub["date"].iloc[0].date()
        end_date = sub["date"].iloc[-1].date()

        peak_idx = sub["gprd_ma30"].idxmax()
        peak_date = df.at[peak_idx, "date"].date()
        peak_val = float(df.at[peak_idx, "gprd_ma30"])

        delta = float(peak_val - baseline)
        raw = float(length * max(peak_val - baseline, 0.0))
        # raw severity metric (unbounded-ish), then scaled to a 0-10 rough score
        raw_severity = min(raw / (50.0 + baseline), 10.0)
        # Normalize severity to [0,1] for system-wide consistency
        severity = float(min(max(raw_severity / 10.0, 0.0), 1.0))
        percentile = _percentile_of(peak_val, full_ma30)

        ev = GprEvent(
            event_id=f"regime-{start_date.isoformat()}-{end_date.isoformat()}",
            event_type=GprEventType.REGIME,
            start_date=start_date,
            end_date=end_date,
            peak_date=peak_date,
            gpr_level_at_peak=peak_val,
            gpr_delta_from_baseline=delta,
            severity_score=severity,
            percentile=percentile,
            label="Structural regime",
        )
        events.append(ev)

    return events
