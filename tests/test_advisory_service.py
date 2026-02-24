from datetime import date

import pytest

from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType
from gpr_overlay.data_models.industry_impact import EventImpactProfile, EventIndustryImpact
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.data_models.portfolio_snapshot import PortfolioSnapshot
from gpr_overlay.services.advisory_service import build_advisory_report


def _make_event():
    return GprEvent(
        event_id="e1",
        event_type=GprEventType.SHORT_TERM_SPIKE,
        start_date=date(2020, 1, 1),
        end_date=date(2020, 1, 1),
        peak_date=date(2020, 1, 1),
        gpr_level_at_peak=100.0,
        gpr_delta_from_baseline=20.0,
        severity_score=1.0,
        percentile=0.95,
    )


def test_build_advisory_report_basic():
    snapshot = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[])
    evt = _make_event()

    ind_v = EventIndustryImpact(
        fed_industry_id="v1",
        fed_industry_name="Vulnerable Industry",
        portfolio_weight=10.0,
        gpr_beta=-0.02,
        impact_score=-0.002,
        direction="negative",
    )
    ind_r = EventIndustryImpact(
        fed_industry_id="r1",
        fed_industry_name="Resilient Industry",
        portfolio_weight=5.0,
        gpr_beta=0.01,
        impact_score=0.0005,
        direction="positive",
    )

    profile = EventImpactProfile(
        event=evt,
        industries=[ind_v, ind_r],
        vulnerable_industries=[ind_v],
        resilient_industries=[ind_r],
        total_negative_impact=-0.002,
        total_positive_impact=0.0005,
        net_impact=-0.0015,
        portfolio_vulnerability_baseline=0.0,
    )

    report = build_advisory_report(snapshot, profile)
    assert report.fund_name == "Test Fund"
    assert report.summary
    assert len(report.key_points) >= 1
    # Python no longer emits recommended_actions; ensure the serialized report does not include that key
    assert "recommended_actions" not in report.model_dump()


def test_esg_banned_industries_not_tilted_up():
    snapshot = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[])
    evt = _make_event()

    ind_banned = EventIndustryImpact(
        fed_industry_id="b1",
        fed_industry_name="Coal",
        portfolio_weight=5.0,
        gpr_beta=0.02,
        impact_score=0.001,
        direction="positive",
    )
    ind_ok = EventIndustryImpact(
        fed_industry_id="r2",
        fed_industry_name="Tech",
        portfolio_weight=7.0,
        gpr_beta=0.015,
        impact_score=0.00105,
        direction="positive",
    )

    profile = EventImpactProfile(
        event=evt,
        industries=[ind_banned, ind_ok],
        vulnerable_industries=[],
        resilient_industries=[ind_banned, ind_ok],
        total_negative_impact=0.0,
        total_positive_impact=0.00205,
        net_impact=0.00205,
        portfolio_vulnerability_baseline=0.0,
    )

    report = build_advisory_report(snapshot, profile)
    # Python no longer emits recommended_actions.
    assert "recommended_actions" not in report.model_dump()
    # Key resilient industries should include Tech
    assert "Tech" in report.top_resilient_industries
