from pathlib import Path
from datetime import date
import json

from gpr_overlay.services.portfolio_overlay_service import load_portfolio_snapshot_from_csv, compute_portfolio_industry_exposure
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact
from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType


def _write_csv(path: Path, header: str, rows: list[str]):
    path.write_text("\n".join([header] + rows), encoding="utf-8")


def test_shortlist_top_n_per_industry(tmp_path):
    # Prepare a CSV with 3 holdings in Industry A and 2 in Industry B
    p = tmp_path / "fund.csv"
    header = (
        "fund_name,as_of_date,security_name_report,ticker_guess,weight_pct,"
        "fed_industry_id,fed_industry_name,gpr_beta,region_guess,country_guess"
    )
    rows = [
        "Demo,2025-09-30,Comp A,AAA,40.0,IND_A,Industry A,0.5,Switzerland,CH",
        "Demo,2025-09-30,Comp B,BBB,30.0,IND_A,Industry A,0.3,Switzerland,CH",
        "Demo,2025-09-30,Comp C,CCC,10.0,IND_A,Industry A,0.1,Switzerland,CH",
        "Demo,2025-09-30,Comp D,DDD,12.0,IND_B,Industry B,0.2,Switzerland,CH",
        "Demo,2025-09-30,Comp E,EEE,8.0,IND_B,Industry B,0.05,Switzerland,CH",
    ]
    _write_csv(p, header, rows)

    snap = load_portfolio_snapshot_from_csv(p)
    exposures = compute_portfolio_industry_exposure(snap)

    # Construct a synthetic event with severity 1.0
    ev = GprEvent(
        event_id="ev1",
        event_type=GprEventType.SHORT_TERM_SPIKE,
        start_date=date(2025, 9, 1),
        end_date=date(2025, 9, 1),
        peak_date=date(2025, 9, 1),
        gpr_level_at_peak=10.0,
        gpr_delta_from_baseline=5.0,
        severity_score=1.0,
        percentile=0.99,
    )

    profile = compute_event_portfolio_impact(ev, exposures)

    # Ensure per-industry share fields are present and within [0,1]
    for it in profile.industries:
        assert hasattr(it, "industry_weight_share_of_portfolio")
        assert 0.0 <= (it.industry_weight_share_of_portfolio or 0.0) <= 1.0
        assert hasattr(it, "industry_weight_share_of_vulnerable")
        assert 0.0 <= (it.industry_weight_share_of_vulnerable or 0.0) <= 1.0

    # Build shortlists per spec: group by fed_industry_name, sort by weight_pct desc, top N per industry
    per_industry = 2
    holdings_list = [
        {
            "security_name_report": h.security_name_report,
            "weight_pct": h.weight_pct,
            "fed_industry_name": h.fed_industry_name,
            "region_guess": getattr(h, "region_guess", None),
            "country_guess": getattr(h, "country_guess", None),
        }
        for h in snap.holdings
    ]

    # Select industries in union (vulnerable+resilient)
    sel_names = {it.fed_industry_name for it in (profile.vulnerable_industries + profile.resilient_industries)}

    # Group and sort
    from collections import defaultdict

    by_ind = defaultdict(list)
    for h in holdings_list:
        name = h.get("fed_industry_name") or "__unknown__"
        if name in sel_names:
            by_ind[name].append(h)

    shortlists = {}
    for ind, items in by_ind.items():
        items_sorted = sorted(items, key=lambda x: float(x.get("weight_pct") or 0.0), reverse=True)
        shortlists[ind] = items_sorted[:per_industry]

    # Assertions:
    # Industry A should have top 2: Comp A (40), Comp B (30)
    assert "Industry A" in shortlists
    assert len(shortlists["Industry A"]) == 2
    assert shortlists["Industry A"][0]["security_name_report"] == "Comp A"
    assert shortlists["Industry A"][1]["security_name_report"] == "Comp B"

    # Fields included only those specified
    sample = shortlists["Industry A"][0]
    assert set(sample.keys()) == {"security_name_report", "weight_pct", "fed_industry_name", "region_guess", "country_guess"}

    # Industry B top 2 should be Comp D (12), Comp E (8)
    assert "Industry B" in shortlists
    assert shortlists["Industry B"][0]["security_name_report"] == "Comp D"

