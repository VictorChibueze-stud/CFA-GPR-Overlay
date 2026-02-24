from datetime import date

import pytest

from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact


def _make_event(severity: float) -> GprEvent:
    return GprEvent(
        event_id="evt-1",
        event_type=GprEventType.SHORT_TERM_SPIKE,
        start_date=date(2020, 1, 1),
        end_date=date(2020, 1, 1),
        peak_date=date(2020, 1, 1),
        gpr_level_at_peak=100.0,
        gpr_delta_from_baseline=20.0,
        severity_score=severity,
        percentile=0.99,
    )


def test_event_portfolio_impact_simple_negative():
    event = _make_event(severity=1.0)
    exposure = IndustryExposure(
        fed_industry_id="ind_a",
        fed_industry_name="Industry A",
        portfolio_weight=10.0,
        gpr_beta=-0.02,
    )

    profile = compute_event_portfolio_impact(event, [exposure])
    assert len(profile.industries) == 1
    assert profile.total_negative_impact < 0
    assert profile.total_positive_impact == 0
    assert profile.net_impact == pytest.approx(profile.total_negative_impact)
    assert profile.vulnerable_industries[0].fed_industry_id == "ind_a"
    assert profile.vulnerable_industries[0].direction == "negative"


def test_event_portfolio_impact_mixed_signs():
    event = _make_event(severity=1.0)
    a = IndustryExposure(
        fed_industry_id="ind_a",
        fed_industry_name="Industry A",
        portfolio_weight=30.0,
        gpr_beta=-0.01,
    )
    b = IndustryExposure(
        fed_industry_id="ind_b",
        fed_industry_name="Industry B",
        portfolio_weight=20.0,
        gpr_beta=0.02,
    )

    profile = compute_event_portfolio_impact(event, [a, b])
    ids = {i.fed_industry_id for i in profile.industries}
    assert "ind_a" in ids and "ind_b" in ids
    assert len(profile.vulnerable_industries) >= 1
    assert len(profile.resilient_industries) >= 1
    assert profile.total_negative_impact < 0
    assert profile.total_positive_impact > 0
    assert profile.net_impact == pytest.approx(profile.total_negative_impact + profile.total_positive_impact)


def test_event_portfolio_impact_respects_severity():
    low = _make_event(severity=0.2)
    high = _make_event(severity=0.8)
    e = IndustryExposure(
        fed_industry_id="ind_c",
        fed_industry_name="Industry C",
        portfolio_weight=50.0,
        gpr_beta=-0.02,
    )

    profile_low = compute_event_portfolio_impact(low, [e])
    profile_high = compute_event_portfolio_impact(high, [e])

    assert abs(profile_high.total_negative_impact) > abs(profile_low.total_negative_impact)
    # Rough proportionality check
    ratio = abs(profile_high.total_negative_impact) / abs(profile_low.total_negative_impact)
    assert ratio == pytest.approx(4.0, rel=0.1)
