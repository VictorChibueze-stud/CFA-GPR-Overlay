from datetime import date, timedelta
from typing import List
import math

import numpy as np

from gpr_overlay.data_models.gpr_series import GprDailyPoint
from gpr_overlay.data_models.gpr_event import GprEventType
from gpr_overlay.services.gpr_event_detection_service import detect_gpr_events


def _build_series(start_date: date, values: List[float]) -> List[GprDailyPoint]:
    """Helper to build a synthetic GprDailyPoint time series from scalar values."""
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


def test_spike_severity_monotonicity():
    """
    A larger raw spike should NOT produce a *smaller* severity score.

    The detector normalizes severity to [0,1] via z/5 and clips at 1.0, so
    very large spikes can saturate at 1.0. In that regime we cannot demand
    strictly increasing severity; we only require that the larger spike
    does not end up with LOWER severity.
    """
    start = date(2000, 1, 1)
    baseline = [50.0] * 40
    tail = [50.0] * 10

    vals_a = baseline + [80.0] + tail
    vals_b = baseline + [120.0] + tail

    pts_a = _build_series(start, vals_a)
    pts_b = _build_series(start, vals_b)

    events_a = detect_gpr_events(pts_a)
    events_b = detect_gpr_events(pts_b)

    spikes_a = [e for e in events_a if e.event_type == GprEventType.SHORT_TERM_SPIKE]
    spikes_b = [e for e in events_b if e.event_type == GprEventType.SHORT_TERM_SPIKE]

    assert len(spikes_a) >= 1
    assert len(spikes_b) >= 1

    # Choose the main spike by highest severity in each series
    sev_a = max(s.severity_score for s in spikes_a)
    sev_b = max(s.severity_score for s in spikes_b)

    assert 0.0 <= sev_a <= 1.0
    assert 0.0 <= sev_b <= 1.0

    # Non-decreasing check with tiny epsilon: larger raw spike must not get *less* severity
    eps = 1e-6
    assert sev_b + eps >= sev_a


def test_baseline_sensitivity():
    """
    Spikes are detected relative to local baseline; severity remains in [0,1]
    even when the baseline level shifts.
    """
    start = date(2001, 1, 1)
    tail = [60.0] * 10

    # Baseline 50 -> spike to 100
    vals1 = [50.0] * 40 + [100.0] + tail
    # Baseline 100 -> spike to 150
    vals2 = [100.0] * 40 + [150.0] + tail

    pts1 = _build_series(start, vals1)
    pts2 = _build_series(start, vals2)

    ev1 = detect_gpr_events(pts1)
    ev2 = detect_gpr_events(pts2)

    spikes1 = [e for e in ev1 if e.event_type == GprEventType.SHORT_TERM_SPIKE]
    spikes2 = [e for e in ev2 if e.event_type == GprEventType.SHORT_TERM_SPIKE]

    assert len(spikes1) >= 1
    assert len(spikes2) >= 1

    for s in spikes1 + spikes2:
        assert 0.0 <= s.severity_score <= 1.0


def test_range_and_numeric_sanity():
    """
    Random synthetic series with baseline + noise and a few injected spikes.

    Ensure detection yields numerically sane outputs:
    - severity in [0,1]
    - percentile in [0,100]
    - key numeric fields are not NaN
    """
    np.random.seed(123)
    start = date(2021, 1, 1)
    n = 200

    # baseline 50 with light noise
    noise = np.random.normal(scale=1.5, size=n)
    vals = [50.0 + float(noise[i]) for i in range(n)]

    # Inject a few spikes at deterministic positions
    for idx, add in [(50, 40.0), (120, 60.0), (160, 80.0)]:
        vals[idx] = float(vals[idx] + add)

    pts = _build_series(start, vals)
    events = detect_gpr_events(pts)

    for e in events:
        # severity & percentile ranges
        assert e.severity_score is not None
        assert 0.0 <= e.severity_score <= 1.0
        assert e.percentile is not None
        assert 0.0 <= e.percentile <= 1.0

        # numeric fields should not be NaN
        assert e.gpr_level_at_peak is not None and not math.isnan(e.gpr_level_at_peak)
        assert e.gpr_delta_from_baseline is not None and not math.isnan(e.gpr_delta_from_baseline)
