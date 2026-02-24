from datetime import date

import pytest

from gpr_overlay.data_models.portfolio_snapshot import PortfolioSnapshot, PortfolioHolding
from gpr_overlay.services.portfolio_overlay_service import (
    compute_portfolio_industry_exposure,
    compute_portfolio_gpr_vulnerability,
)


def test_single_industry_portfolio():
    holding = PortfolioHolding(
        security_name_report="Bank A",
        weight_pct=10.0,
        fed_industry_id="banks",
        fed_industry_name="Depository Institutions",
        gpr_beta=-0.02,
    )
    snap = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[holding])

    exposures = compute_portfolio_industry_exposure(snap)
    assert len(exposures) == 1
    e = exposures[0]
    assert pytest.approx(e.portfolio_weight, rel=1e-9) == 10.0
    assert pytest.approx(e.gpr_beta, rel=1e-9) == -0.02

    vuln = compute_portfolio_gpr_vulnerability(exposures)
    assert vuln == pytest.approx(0.10 * -0.02, rel=1e-9)


def test_two_industries_different_betas():
    a = PortfolioHolding(
        security_name_report="A",
        weight_pct=30.0,
        fed_industry_id="ind_a",
        fed_industry_name="Industry A",
        gpr_beta=-0.01,
    )
    b = PortfolioHolding(
        security_name_report="B",
        weight_pct=20.0,
        fed_industry_id="ind_b",
        fed_industry_name="Industry B",
        gpr_beta=0.02,
    )
    snap = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[a, b])

    exposures = compute_portfolio_industry_exposure(snap)
    assert len(exposures) == 2
    weights = {e.fed_industry_id: e.portfolio_weight for e in exposures}
    assert pytest.approx(weights["ind_a"], rel=1e-9) == 30.0
    assert pytest.approx(weights["ind_b"], rel=1e-9) == 20.0

    vuln = compute_portfolio_gpr_vulnerability(exposures)
    expected = (0.30 * -0.01) + (0.20 * 0.02)
    assert vuln == pytest.approx(expected, rel=1e-9)


def test_multiple_holdings_same_industry_weighted_beta():
    a = PortfolioHolding(
        security_name_report="C1",
        weight_pct=5.0,
        fed_industry_id="ind_c",
        fed_industry_name="Industry C",
        gpr_beta=-0.01,
    )
    b = PortfolioHolding(
        security_name_report="C2",
        weight_pct=15.0,
        fed_industry_id="ind_c",
        fed_industry_name="Industry C",
        gpr_beta=-0.03,
    )
    snap = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[a, b])

    exposures = compute_portfolio_industry_exposure(snap)
    assert len(exposures) == 1
    e = exposures[0]
    assert pytest.approx(e.portfolio_weight, rel=1e-9) == 20.0
    # Weighted beta calculation
    assert pytest.approx(e.gpr_beta, rel=1e-9) == -0.025


def test_ignore_holdings_without_industry_or_beta():
    a = PortfolioHolding(
        security_name_report="Valid",
        weight_pct=10.0,
        fed_industry_id="ind_x",
        fed_industry_name="Industry X",
        gpr_beta=0.05,
    )
    b = PortfolioHolding(
        security_name_report="NoIndustry",
        weight_pct=5.0,
        fed_industry_id=None,
        fed_industry_name=None,
        gpr_beta=0.02,
    )
    c = PortfolioHolding(
        security_name_report="NoBeta",
        weight_pct=8.0,
        fed_industry_id="ind_y",
        fed_industry_name="Industry Y",
        gpr_beta=None,
    )
    snap = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[a, b, c])

    exposures = compute_portfolio_industry_exposure(snap)
    # Only the valid holding should contribute
    assert len(exposures) == 1
    e = exposures[0]
    assert e.fed_industry_id == "ind_x"
    vuln = compute_portfolio_gpr_vulnerability(exposures)
    assert vuln == pytest.approx((10.0 / 100.0) * 0.05, rel=1e-9)


def test_zero_total_weight_industry_is_skipped():
    # Two holdings mapped to same industry but both have zero weight
    a = PortfolioHolding(
        security_name_report="Z1",
        weight_pct=0.0,
        fed_industry_id="zero_ind",
        fed_industry_name="Zero Industry",
        gpr_beta=0.01,
    )
    b = PortfolioHolding(
        security_name_report="Z2",
        weight_pct=0.0,
        fed_industry_id="zero_ind",
        fed_industry_name="Zero Industry",
        gpr_beta=0.02,
    )
    snap = PortfolioSnapshot(fund_name="Test Fund", as_of_date=date(2000, 1, 1), holdings=[a, b])

    exposures = compute_portfolio_industry_exposure(snap)
    # industry with effectively zero total weight should be skipped
    assert all(e.fed_industry_id != "zero_ind" for e in exposures)
    # vulnerability of empty exposures should be zero
    assert compute_portfolio_gpr_vulnerability(exposures) == pytest.approx(0.0, rel=1e-9)
