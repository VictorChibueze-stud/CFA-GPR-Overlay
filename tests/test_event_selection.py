from datetime import date

from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType
from gpr_overlay.services.gpr_event_detection_service import select_event_for_target_date


def _make_event(event_id: str, etype: GprEventType, start: date, end: date, peak: date, severity: float = 0.5) -> GprEvent:
    return GprEvent(
        event_id=event_id,
        event_type=etype,
        start_date=start,
        end_date=end,
        peak_date=peak,
        gpr_level_at_peak=100.0,
        gpr_delta_from_baseline=10.0,
        severity_score=severity,
        percentile=0.9,
    )


def test_select_event_inside_range():
    # Spike on 2022-03-01
    spike = _make_event("s1", GprEventType.SHORT_TERM_SPIKE, date(2022, 3, 1), date(2022, 3, 1), date(2022, 3, 1))
    # Episode covering 2022-02-20 .. 2022-03-31
    episode = _make_event("ep1", GprEventType.EPISODE, date(2022, 2, 20), date(2022, 3, 31), date(2022, 3, 10), severity=0.7)
    # Distant regime
    regime = _make_event("rg1", GprEventType.REGIME, date(2021, 1, 1), date(2021, 12, 31), date(2021, 6, 1))

    selected = select_event_for_target_date([spike, episode, regime], date(2022, 3, 10))
    assert selected is not None
    assert selected.event_id == "ep1"


def test_select_event_closest_peak_when_none_contain():
    # Two episodes with peaks on 2022-02-01 and 2022-04-01
    ep_a = _make_event("a", GprEventType.EPISODE, date(2022, 1, 20), date(2022, 2, 10), date(2022, 2, 1))
    ep_b = _make_event("b", GprEventType.EPISODE, date(2022, 3, 20), date(2022, 4, 10), date(2022, 4, 1))

    # target date 2022-03-01 lies between peaks; closer to ep_a (February 1 is 28 days away, April 1 is 31)
    selected = select_event_for_target_date([ep_a, ep_b], date(2022, 3, 1))
    assert selected is not None
    assert selected.event_id == "a"
