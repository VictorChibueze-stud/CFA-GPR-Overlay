from pathlib import Path
from gpr_overlay.services.portfolio_overlay_service import load_portfolio_snapshot_from_csv


def test_load_portfolio_snapshot_from_csv_basic():
    csv_path = Path("data/fund/blkb_iq_responsible_equity_ch_2025-09-30.csv")
    snapshot = load_portfolio_snapshot_from_csv(csv_path)

    assert snapshot.fund_name
    assert snapshot.holdings

    # Sum of weights should be roughly 100%
    total_weight = sum(h.weight_pct for h in snapshot.holdings)
    assert 90.0 <= total_weight <= 110.0

    # At least one holding should have a fed_industry_id and gpr_beta
    has_industry_info = any(
        h.fed_industry_id is not None and h.gpr_beta is not None
        for h in snapshot.holdings
    )
    assert has_industry_info
