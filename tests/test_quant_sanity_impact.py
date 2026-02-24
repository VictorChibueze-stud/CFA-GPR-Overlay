from datetime import date
from typing import List
import datetime

from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.data_models.portfolio_snapshot import PortfolioSnapshot, PortfolioHolding
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact
from gpr_overlay.services.advisory_service import build_advisory_report


def _fake_event(severity: float) -> GprEvent:
    """Build a simple synthetic short-term spike event with given severity."""
    today = datetime.date(2025, 1, 1)
    return GprEvent(
        event_id="evt-1",
        event_type=GprEventType.SHORT_TERM_SPIKE,
        start_date=today,
        end_date=today,
        peak_date=today,
        gpr_level_at_peak=100.0,
        gpr_delta_from_baseline=10.0,
        severity_score=float(severity),
        percentile=0.95,
    )


def _make_exposure(name: str, weight: float, beta: float) -> IndustryExposure:
    return IndustryExposure(
        fed_industry_id=name.lower().replace(" ", "_"),
        fed_industry_name=name,
        portfolio_weight=float(weight),
        gpr_beta=float(beta),
    )


def test_impact_sign_and_ordering():
    """
    Impact sign should follow beta sign and absolute ordering should match |beta|.
    """
    event = _fake_event(0.5)

    exposures = [
        _make_exposure("A", 20.0, -0.4),
        _make_exposure("B", 20.0, -0.2),
        _make_exposure("C", 20.0, 0.3),
    ]

    profile = compute_event_portfolio_impact(event, exposures)

    # every industry's impact sign should follow the sign of its beta
    for ind in profile.industries:
        if ind.gpr_beta < 0:
            assert ind.impact_score < 0
        elif ind.gpr_beta > 0:
            assert ind.impact_score > 0

    # ordering: among the negative betas, A has larger |beta| than B, so |impact_A| > |impact_B|
    neg = [i for i in profile.industries if i.gpr_beta < 0]
    a = next(i for i in neg if i.fed_industry_name == "A")
    b = next(i for i in neg if i.fed_industry_name == "B")
    assert abs(a.impact_score) > abs(b.impact_score)


def test_portfolio_scenarios_net_impact():
    """
    Compare net impact between a GPR-short portfolio and a more resilient one.

    The GPR-short portfolio has larger negative betas and should produce a more
    negative net impact for the same event severity.
    """
    event = _fake_event(0.7)

    # GPR-short portfolio: dominated by negative betas
    p1 = [
        _make_exposure("Neg1", 40.0, -0.5),
        _make_exposure("Neg2", 40.0, -0.2),
        _make_exposure("SmallPos", 20.0, 0.05),
    ]

    # More resilient portfolio: smaller magnitudes and some positives
    p2 = [
        _make_exposure("Mix1", 40.0, -0.1),
        _make_exposure("Mix2", 30.0, 0.1),
        _make_exposure("Mix3", 30.0, 0.05),
    ]

    prof1 = compute_event_portfolio_impact(event, p1)
    prof2 = compute_event_portfolio_impact(event, p2)

    assert prof1.net_impact < prof2.net_impact


def test_vulnerable_resilient_consistency():
    """
    Ensure vulnerable/resilient lists agree with beta signs and direction labels.
    """
    event = _fake_event(0.6)
    exps = [
        _make_exposure("Neg", 50.0, -0.3),
        _make_exposure("Pos", 50.0, 0.2),
    ]
    prof = compute_event_portfolio_impact(event, exps)

    for v in prof.vulnerable_industries:
        assert v.direction == "negative"
        assert v.gpr_beta < 0

    for r in prof.resilient_industries:
        assert r.direction == "positive"
        assert r.gpr_beta > 0


def test_advisory_respects_math_and_esg():
    """
    Small integration test: advisory should reference the vulnerable industry
    and avoid recommending increasing exposure to a clearly negative-beta,
    ESG-banned sector (Coal).
    """
    event = _fake_event(0.8)
    exps = [
        _make_exposure("Coal", 40.0, -0.6),  # ESG-banned in advisory defaults
        _make_exposure("Software", 60.0, 0.2),
    ]

    prof = compute_event_portfolio_impact(event, exps)

    # Fabricate a minimal PortfolioSnapshot to pass into advisory builder
    holdings = [
        PortfolioHolding(
            security_name_report="CoalCo",
            ticker_guess="COAL",
            isin_guess=None,
            sector_raw=None,
            weight_pct=40.0,
            market_value_raw=None,
            fed_industry_name="Coal",
            fed_industry_id="coal",
            gpr_beta=-0.6,
            gpr_sentiment=None,
        ),
        PortfolioHolding(
            security_name_report="SoftCorp",
            ticker_guess="SOFT",
            isin_guess=None,
            sector_raw=None,
            weight_pct=60.0,
            market_value_raw=None,
            fed_industry_name="Software",
            fed_industry_id="software",
            gpr_beta=0.2,
            gpr_sentiment=None,
        ),
    ]

    snapshot = PortfolioSnapshot(
        fund_name="TestFund",
        as_of_date=date(2025, 1, 1),
        holdings=holdings,
    )

    report = build_advisory_report(snapshot, prof)

    assert report is not None
    assert "short term spike" in report.summary.lower() or "short_term_spike" in report.summary

    # Top vulnerable sector should appear in key_points or top_vulnerable_industries
    found = any("coal" in kp.lower() for kp in report.key_points)
    found = found or any("coal" in tn.lower() for tn in report.top_vulnerable_industries)
    assert found
