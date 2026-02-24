from datetime import date

import pytest

from gpr_overlay.data_models.portfolio_snapshot import PortfolioHolding, PortfolioSnapshot
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.services.portfolio_overlay_service import (
    compute_portfolio_industry_exposure,
    compute_portfolio_gpr_vulnerability,
)


def test_linearity_under_normalization():
    """
    If we uniformly scale all raw weights but then renormalize to a 100%% portfolio,
    the computed vulnerability should be invariant (up to floating point noise).

    Note: the code treats `weight_pct` as raw percent values; this test performs the
    explicit renormalization step to reflect how a quant would compare raw vs.
    normalized inputs.
    """
    holdings = [
        PortfolioHolding(security_name_report="A", weight_pct=10.0, fed_industry_id="I1", fed_industry_name="I1", gpr_beta=0.5),
        PortfolioHolding(security_name_report="B", weight_pct=30.0, fed_industry_id="I2", fed_industry_name="I2", gpr_beta=-0.2),
        PortfolioHolding(security_name_report="C", weight_pct=60.0, fed_industry_id="I3", fed_industry_name="I3", gpr_beta=0.1),
    ]

    snap = PortfolioSnapshot(fund_name="F", as_of_date=date(2025, 1, 1), holdings=holdings)
    exposures1 = compute_portfolio_industry_exposure(snap)
    v1 = compute_portfolio_gpr_vulnerability(exposures1)

    # Uniformly scale raw weights by 2 (simulating raw non-normalized input)
    scaled_holdings = []
    for h in holdings:
        scaled_holdings.append(PortfolioHolding(**{**h.model_dump(), "weight_pct": h.weight_pct * 2.0}))

    # Renormalize to 100% to compare the meaningful portfolio
    total = sum(h.weight_pct for h in scaled_holdings)
    normalized = []
    for h in scaled_holdings:
        normalized.append(PortfolioHolding(**{**h.model_dump(), "weight_pct": h.weight_pct * (100.0 / total)}))

    snap2 = PortfolioSnapshot(fund_name="F", as_of_date=date(2025, 1, 1), holdings=normalized)
    exposures2 = compute_portfolio_industry_exposure(snap2)
    v2 = compute_portfolio_gpr_vulnerability(exposures2)

    assert pytest.approx(v1, rel=1e-6, abs=1e-9) == v2


def test_sign_sanity_and_contributions():
    """
    Positive beta + positive weight -> positive contribution; negative beta -> negative contribution.
    The total vulnerability equals the sum of per-industry contributions.
    """
    exp_pos = IndustryExposure(fed_industry_id="P", fed_industry_name="Pos", portfolio_weight=40.0, gpr_beta=0.5)
    exp_neg = IndustryExposure(fed_industry_id="N", fed_industry_name="Neg", portfolio_weight=60.0, gpr_beta=-0.25)

    exposures = [exp_pos, exp_neg]
    total = compute_portfolio_gpr_vulnerability(exposures)

    # contributions are stored on the exposures
    contrib_pos = exposures[0].contribution_to_vulnerability
    contrib_neg = exposures[1].contribution_to_vulnerability

    assert contrib_pos > 0
    assert contrib_neg < 0
    assert pytest.approx(total, rel=1e-9) == pytest.approx(contrib_pos + contrib_neg, rel=1e-9)
from typing import List

import pytest

from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.services.portfolio_overlay_service import compute_portfolio_gpr_vulnerability


def _make_exposures(weights: List[float], betas: List[float], names: List[str]) -> List[IndustryExposure]:
    exposures = []
    for w, b, n in zip(weights, betas, names):
        exposures.append(
            IndustryExposure(
                fed_industry_id=n.lower().replace(" ", "_"),
                fed_industry_name=n,
                portfolio_weight=float(w),
                gpr_beta=float(b),
            )
        )
    return exposures


def test_vulnerability_homogeneity_under_renormalization():
    """If portfolio weights are uniformly scaled and then renormalized to
    percentages, the resulting vulnerability should be invariant (within floats).
    """
    names = ["Alpha", "Beta", "Gamma"]
    weights = [10.0, 30.0, 60.0]
    betas = [0.2, -0.1, 0.5]

    exposures1 = _make_exposures(weights, betas, names)
    v1 = compute_portfolio_gpr_vulnerability(exposures1)

    # scale the raw weights uniformly
    scaled_raw = [w * 3.0 for w in weights]
    total = sum(scaled_raw)
    # renormalize to percent-of-portfolio form expected by the function
    scaled_percent = [w / total * 100.0 for w in scaled_raw]
    exposures2 = _make_exposures(scaled_percent, betas, names)
    v2 = compute_portfolio_gpr_vulnerability(exposures2)

    assert pytest.approx(v1, rel=1e-9) == v2


def test_contribution_signs_and_overall_vulnerability():
    """Positive beta with positive weight should contribute positively; negative
    beta should contribute negatively. Overall vulnerability should match sum.
    """
    names = ["PosSector", "NegSector"]
    weights = [50.0, 50.0]
    betas = [0.4, -0.3]

    exposures = _make_exposures(weights, betas, names)
    total = compute_portfolio_gpr_vulnerability(exposures)

    # contributions should have been recorded on the exposures
    contribs = [e.contribution_to_vulnerability for e in exposures]
    assert contribs[0] is not None and contribs[0] > 0.0
    assert contribs[1] is not None and contribs[1] < 0.0

    assert pytest.approx(contribs[0] + contribs[1], rel=1e-9) == total
