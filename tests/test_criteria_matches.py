from pathlib import Path
from datetime import date
import json

from gpr_overlay.services.portfolio_overlay_service import load_portfolio_snapshot_from_csv


def _write_csv(path: Path, header: str, rows: list[str]):
    path.write_text("\n".join([header] + rows), encoding="utf-8")


def test_criteria_top_level_list_matching(tmp_path):
    p = tmp_path / "fund.csv"
    header = (
        "fund_name,as_of_date,security_name_report,ticker_guess,weight_pct,"
        "fed_industry_id,fed_industry_name,gpr_beta,region_guess,country_guess"
    )
    rows = [
        "Demo,2025-09-30,Comp A,AAA,40.0,IND_A,Industry A,0.5,Switzerland,CH",
        "Demo,2025-09-30,Comp B,BBB,20.0,IND_A,Industry A,0.3,switzerland,CH",
        "Demo,2025-09-30,Comp C,CCC,10.0,IND_B,Industry B,0.1,France,FR",
    ]
    _write_csv(p, header, rows)

    snap = load_portfolio_snapshot_from_csv(p)

    # Create criteria JSON (top-level list)
    criteria = [
        {"cluster_id": "c1", "region_guess": "Switzerland", "industry_name": "Industry A"}
    ]
    crit_file = tmp_path / "crit.json"
    crit_file.write_text(json.dumps(criteria), encoding="utf-8")

    # Matching logic per spec: case-insensitive exact match after strip
    parsed = json.loads(crit_file.read_text(encoding="utf-8"))
    matches = []
    for crit in parsed:
        for h in snap.holdings:
            h_region = (getattr(h, "region_guess", "") or "").strip()
            h_ind = (h.fed_industry_name or "").strip()
            if h_region.lower() == crit["region_guess"].strip().lower() and h_ind.lower() == crit["industry_name"].strip().lower():
                matches.append({
                    "security_name_report": h.security_name_report,
                    "weight_pct": h.weight_pct,
                    "fed_industry_name": h.fed_industry_name,
                    "region_guess": getattr(h, "region_guess", None),
                    "country_guess": getattr(h, "country_guess", None),
                })

    assert len(matches) == 2
    assert any(m["security_name_report"] == "Comp A" for m in matches)
    assert any(m["security_name_report"] == "Comp B" for m in matches)


def test_criteria_flow1_format_matching(tmp_path):
    p = tmp_path / "fund2.csv"
    header = (
        "fund_name,as_of_date,security_name_report,ticker_guess,weight_pct,"
        "fed_industry_id,fed_industry_name,gpr_beta,region_guess,country_guess"
    )
    rows = [
        "Demo,2025-09-30,Comp X,XXX,15.0,IND_X,Industry X,0.2,Spain,ES",
        "Demo,2025-09-30,Comp Y,YYY,25.0,IND_Y,Industry Y,0.3,Spain,ES",
    ]
    _write_csv(p, header, rows)

    snap = load_portfolio_snapshot_from_csv(p)

    # Flow1 raw format example
    flow1 = {
        "channels_by_cluster": [
            {
                "cluster_id": "cl1",
                "region": "Spain",
                "economic_channels": [
                    {"linked_industries": [{"industry_name": "Industry Y"}]}
                ],
            }
        ]
    }
    flow1_file = tmp_path / "flow1.json"
    flow1_file.write_text(json.dumps(flow1), encoding="utf-8")

    raw = json.loads(flow1_file.read_text(encoding="utf-8"))
    parsed_criteria = []
    clusters = raw.get("channels_by_cluster") or []
    for cl in clusters:
        cid = cl.get("cluster_id")
        region = cl.get("region")
        channels = cl.get("economic_channels") or []
        for ch in channels:
            linked = ch.get("linked_industries") or []
            for li in linked:
                ind = li.get("industry_name")
                if cid and region and ind:
                    parsed_criteria.append({"cluster_id": cid, "region_guess": region, "industry_name": ind})

    matches = []
    for crit in parsed_criteria:
        for h in snap.holdings:
            h_region = (getattr(h, "region_guess", "") or "").strip()
            h_ind = (h.fed_industry_name or "").strip()
            if h_region.lower() == crit["region_guess"].strip().lower() and h_ind.lower() == crit["industry_name"].strip().lower():
                matches.append({
                    "security_name_report": h.security_name_report,
                    "weight_pct": h.weight_pct,
                    "fed_industry_name": h.fed_industry_name,
                    "region_guess": getattr(h, "region_guess", None),
                    "country_guess": getattr(h, "country_guess", None),
                })

    assert len(matches) == 1
    assert matches[0]["security_name_report"] == "Comp Y"
