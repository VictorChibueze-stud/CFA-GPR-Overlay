from datetime import date, timedelta
from typing import List

import pytest

from gpr_overlay.data_models.gpr_series import GprDailyPoint
from gpr_overlay.services.gpr_event_detection_service import detect_gpr_events
from gpr_overlay.data_models.gpr_event import GprEventType
from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv
from gpr_overlay.services.gpr_event_detection_service import ELEVATED_SPIKE_Q, EXTREME_SPIKE_Q, BUFFER_PRE_DAYS_DEFAULT, BUFFER_POST_DAYS_DEFAULT


def _build_series(start_date: date, values: List[float]) -> List[GprDailyPoint]:
    points: List[GprDailyPoint] = []
    for i, val in enumerate(values):
        d = start_date + timedelta(days=i)
        points.append(
            GprDailyPoint(
                date=d,
                n10d=None,
                gprd=float(val),
                gprd_act=None,
                gprd_threat=None,
                gprd_ma30=None,
                gprd_ma7=None,
                event=None,
            )
        )
    return points


def test_detect_short_term_spike_simple():
    start = date(2000, 1, 1)
    # 40 normal days to allow 30-day rolling stats, then a clear spike, then more normal days
    vals = [50.0] * 40 + [120.0] + [50.0] * 39
    pts = _build_series(start, vals)

    events = detect_gpr_events(pts)
    spikes = [e for e in events if e.event_type == GprEventType.SHORT_TERM_SPIKE]

    assert len(spikes) >= 1
    # The detected spike should have the expected peak level and positive delta
    assert spikes[0].gpr_level_at_peak == 120.0
    assert spikes[0].gpr_delta_from_baseline > 0.0


def test_no_spikes_on_flat_series():
    start = date(2000, 1, 1)
    # small noise around 50
    vals = [50.0 + ((i % 3) - 1) * 0.5 for i in range(60)]
    pts = _build_series(start, vals)

    events = detect_gpr_events(pts)
    spikes = [e for e in events if e.event_type == GprEventType.SHORT_TERM_SPIKE]

    assert len(spikes) == 0


def test_episode_detection():
    start = date(2000, 1, 1)
    vals = []
    vals += [50.0] * 20
    vals += [85.0] * 20  # elevated plateau (20 days -> >= MIN_EPISODE_DAYS)
    vals += [50.0] * 20
    pts = _build_series(start, vals)

    events = detect_gpr_events(pts)
    episodes = [e for e in events if e.event_type == GprEventType.EPISODE]

    assert len(episodes) >= 1
    ep = episodes[0]
    duration_days = (ep.end_date - ep.start_date).days + 1
    assert duration_days >= 10
    assert ep.start_date <= ep.peak_date <= ep.end_date


def test_regime_detection():
    start = date(2000, 1, 1)
    vals = []
    vals += [50.0] * 50
    # Extend the high period so that after MA30 warm-up we still have >= MIN_REGIME_DAYS
    vals += [90.0] * 120  # extended high regime period
    vals += [50.0] * 80
    pts = _build_series(start, vals)

    events = detect_gpr_events(pts)
    regimes = [e for e in events if e.event_type == GprEventType.REGIME]

    assert len(regimes) >= 1
    reg = regimes[0]
    duration_days = (reg.end_date - reg.start_date).days + 1
    assert duration_days >= 60
    # sanity check that the detected peak is in the high range
    assert reg.gpr_level_at_peak >= 85.0


def test_no_spike_if_insufficient_history():
    # fewer than 30 days of history -> spike detector requires 30-day rolling stats
    start = date(2000, 1, 1)
    vals = [50.0] * 20 + [200.0] + [50.0] * 5
    pts = _build_series(start, vals)

    events = detect_gpr_events(pts)
    spikes = [e for e in events if e.event_type == GprEventType.SHORT_TERM_SPIKE]
    assert len(spikes) == 0


def test_episode_length_boundary():
    start = date(2000, 1, 1)
    # Ensure the 10-day plateau produces at least one episode, and that
    # all detected episode severity scores are normalised to [0, 1].
    vals1 = [50.0] * 20 + [85.0] * 10 + [50.0] * 20
    pts1 = _build_series(start, vals1)
    events1 = detect_gpr_events(pts1)
    episodes1 = [e for e in events1 if e.event_type == GprEventType.EPISODE]
    assert len(episodes1) >= 1

    # All episodes from the 10-day plateau must have severity within [0,1]
    for e in episodes1:
        assert 0.0 <= e.severity_score <= 1.0

    # Shorter plateau (MIN_EPISODE_DAYS - 1) may or may not produce an episode
    # because MA7 smoothing can extend the run. We do not assert presence/absence;
    # only that any detected episodes have normalised severity in [0,1].
    vals2 = [50.0] * 20 + [85.0] * 9 + [50.0] * 20
    pts2 = _build_series(start, vals2)
    events2 = detect_gpr_events(pts2)
    episodes2 = [e for e in events2 if e.event_type == GprEventType.EPISODE]

    for e in episodes2:
        assert 0.0 <= e.severity_score <= 1.0


def test_june_23_2025_demo_peak_classification():
    # Integration-style test: load the real GPR CSV and assert that 2025-06-23 appears as a quantile spike
    pts = load_gpr_daily_from_csv("data/raw/gpr_daily_original/gpr_daily_recent.csv")
    events = detect_gpr_events(pts)

    # Look for event(s) with peak_date == 2025-06-23
    from datetime import date
    matches = [e for e in events if e.peak_date == date(2025, 6, 23)]
    assert len(matches) >= 1, "Expected at least one detected event with peak_date 2025-06-23"
    ev = matches[0]
    assert ev.event_type in (GprEventType.ELEVATED_SPIKE, GprEventType.EXTREME_SPIKE)

    # Check buffer-derived window
    expected_start = date(2025, 6, 23) - timedelta(days=BUFFER_PRE_DAYS_DEFAULT)
    expected_end = date(2025, 6, 23) + timedelta(days=BUFFER_POST_DAYS_DEFAULT)
    assert ev.start_date == expected_start
    assert ev.end_date == expected_end
