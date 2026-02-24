from pathlib import Path
import json
from gpr_overlay.services.portfolio_overlay_service import load_portfolio_snapshot_from_csv


def _write_csv(path: Path, header: str, rows: list[str]):
    path.write_text("\n".join([header] + rows), encoding="utf-8")


def test_loader_backcompat_without_region_country(tmp_path):
    p = tmp_path / "fund.csv"
    header = (
        "fund_name,as_of_date,security_name_report,ticker_guess,weight_pct,"
        "fed_industry_id,fed_industry_name,gpr_beta"
    )
    rows = [
        "Demo Fund,2025-09-30,Company A,A,10.0,IND1,Industry One,0.5",
        "Demo Fund,2025-09-30,Company B,B,5.0,IND2,Industry Two,0.2",
    ]
    _write_csv(p, header, rows)

    snap = load_portfolio_snapshot_from_csv(p)
    assert snap.fund_name == "Demo Fund"
    assert snap.as_of_date.isoformat() == "2025-09-30"
    assert len(snap.holdings) == 2
    # New optional fields should exist and be None when absent
    for h in snap.holdings:
        assert getattr(h, "region_guess", None) is None
        assert getattr(h, "country_guess", None) is None


def test_loader_with_region_country(tmp_path):
    p = tmp_path / "fund2.csv"
    header = (
        "fund_name,as_of_date,security_name_report,ticker_guess,weight_pct,"
        "fed_industry_id,fed_industry_name,gpr_beta,region_guess,country_guess"
    )
    rows = [
        "Demo Fund,2025-09-30,Company C,C,20.0,IND1,Industry One,0.8,Switzerland,CH",
    ]
    _write_csv(p, header, rows)

    snap = load_portfolio_snapshot_from_csv(p)
    assert len(snap.holdings) == 1
    h = snap.holdings[0]
    assert getattr(h, "region_guess") == "Switzerland"
    assert getattr(h, "country_guess") == "CH"
