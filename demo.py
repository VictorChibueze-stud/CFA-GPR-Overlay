"""Public CLI entrypoint for running the analysis pipeline.

Commands:
  run-analysis  - detect GPR events, load portfolio, compute impact, save JSON

This file is intended as a simple, public-facing CLI that wraps the
internal services in `gpr_overlay`.
"""
from __future__ import annotations

import json
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from pathlib import Path
from typing import Optional
from collections import defaultdict

try:
    import typer
except Exception:
    typer = None

from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv
from gpr_overlay.services.gpr_event_detection_service import (
    detect_gpr_events,
    select_event_for_target_date,
)
from gpr_overlay.services.portfolio_overlay_service import (
    load_portfolio_snapshot_from_csv,
    compute_portfolio_industry_exposure,
)
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact
from gpr_overlay.services.advisory_service import build_advisory_report


def _serialize_model(m):
    # Pydantic v2 -> model_dump_json available; fall back to json() or model_dump
    if hasattr(m, "model_dump_json"):
        return m.model_dump_json(indent=2)
    if hasattr(m, "json"):
        return m.json(indent=2, default=str)
    try:
        return json.dumps(m, indent=2, default=str)
    except Exception:
        return str(m)


def run_analysis(
    gpr_file: str = "data/gpr_daily_sample.csv",
    portfolio_file: str = "data/LCTD_portfolio_2025-12-31.csv",
    output_dir: str = "out",
    event_date: Optional[str] = "2025-06-23",
    output_holdings: str = "holdings_shortlist.json"
):
    print("Processing: loading GPR series...")
    points = load_gpr_daily_from_csv(Path(gpr_file))
    print(f"Loaded {len(points)} GPR points")

    print("Detecting events...")
    print(f"Loading LCTD Publication Portfolio from: {portfolio_file}")
    events = detect_gpr_events(points)
    if not events:
        print("No events detected; exiting.")
        return

    chosen_event = None
    if event_date:
        chosen_event = select_event_for_target_date(events, __import__("datetime").datetime.strptime(event_date, "%Y-%m-%d").date())
    else:
        # prefer last spike-like event else last event
        spikes = [e for e in events if e.event_type.name in ("ELEVATED_SPIKE", "EXTREME_SPIKE")]
        chosen_event = spikes[-1] if spikes else events[-1]

    print(f"Selected event: {chosen_event.event_type.value} peak {chosen_event.peak_date}")

    print("Loading portfolio snapshot...")
    snapshot = load_portfolio_snapshot_from_csv(Path(portfolio_file))

    print("Computing industry exposures...")
    exposures = compute_portfolio_industry_exposure(snapshot)

    print("Computing event impact on portfolio...")
    impact_profile = compute_event_portfolio_impact(chosen_event, exposures)

    print("Building advisory report...")
    report = build_advisory_report(snapshot, impact_profile)

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    event_tag = chosen_event.peak_date if hasattr(chosen_event, "peak_date") else "event"
    impact_path = out / f"impact_{event_tag}.json"
    advisory_path = out / f"advisory_{event_tag}.json"
    holdings_path = out / output_holdings

    print(f"Writing impact profile to {impact_path}")
    with open(impact_path, "w", encoding="utf-8") as f:
        if hasattr(impact_profile, "model_dump_json"):
            f.write(impact_profile.model_dump_json(indent=2))
        else:
            f.write(json.dumps(impact_profile, default=str, indent=2))

    print(f"Writing advisory report to {advisory_path}")
    with open(advisory_path, "w", encoding="utf-8") as f:
        f.write(_serialize_model(report))
        
    # --- HOLDINGS SHORTLIST LOGIC ---
    print(f"Generating holdings shortlist to {holdings_path}...")
    
    # 1. Extract raw holdings info
    holdings_list = []
    for h in snapshot.holdings:
        holdings_list.append({
            "security_name_report": h.security_name_report,
            "weight_pct": h.weight_pct,
            "fed_industry_name": h.fed_industry_name,
            "region_guess": getattr(h, "region_guess", None),
            "country_guess": getattr(h, "country_guess", None),
        })

    # 2. Identify relevant industries (Vulnerable + Resilient)
    sel_industry_names = {it.fed_industry_name for it in (impact_profile.vulnerable_industries + impact_profile.resilient_industries)}

    # 3. Group by industry
    by_ind = defaultdict(list)
    for item in holdings_list:
        name = item.get("fed_industry_name")
        if name in sel_industry_names:
            by_ind[name].append(item)

    # 4. Sort and pick Top 5 per industry
    shortlists = {}
    for ind_name, items in by_ind.items():
        # sort desc by weight
        items_sorted = sorted(items, key=lambda x: float(x.get("weight_pct") or 0.0), reverse=True)
        shortlists[ind_name] = items_sorted[:5]

    # 5. Calculate per-holding industry share
    ind_by_name = {it.fed_industry_name: it for it in impact_profile.industries}
    for ind_name, items in shortlists.items():
        ind_obj = ind_by_name.get(ind_name)
        ind_pw = ind_obj.portfolio_weight if ind_obj else 0.0
        for h in items:
            hw = float(h.get("weight_pct") or 0.0)
            h["industry_weight_share_for_holding"] = float(hw / ind_pw) if ind_pw > 0 else 0.0
            
    # 6. Construct final JSON
    # Need basic event dict for metadata
    ev_obj = {}
    if hasattr(impact_profile.event, "model_dump"):
        ev_obj = impact_profile.event.model_dump()
    elif hasattr(impact_profile.event, "dict"):
        ev_obj = impact_profile.event.dict()
        
    # Fix enum serialization if needed
    if isinstance(ev_obj.get("event_type"), dict):
         ev_obj["event_type"] = ev_obj["event_type"].get("value")
    elif hasattr(impact_profile.event.event_type, "value"):
         ev_obj["event_type"] = impact_profile.event.event_type.value

    holdings_output = {
        "meta": {
            "fund_name": snapshot.fund_name,
            "as_of_date": snapshot.as_of_date.isoformat(),
            "event": ev_obj,
        },
        "vulnerability_composition": getattr(impact_profile, "vulnerability_composition", {}),
        "shortlists_by_industry": shortlists
    }
    
    with open(holdings_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(holdings_output, indent=2, default=str))

    print("Done.")


if __name__ == "__main__":
    if typer:
        typer.run(run_analysis)
    else:
        # Fallback to argparse
        import argparse
        parser = argparse.ArgumentParser()
        parser.add_argument("--gpr-file", default="data/gpr_daily_sample.csv")
        parser.add_argument("--portfolio-file", default="data/LCTD_portfolio_2025-12-31.csv")
        parser.add_argument("--output-dir", default="out")
        parser.add_argument("--event-date", default="2025-06-23")
        parser.add_argument("--output-holdings", default="holdings_shortlist.json")
        
        args, _ = parser.parse_known_args()
        run_analysis(args.gpr_file, args.portfolio_file, args.output_dir, args.event_date, args.output_holdings)