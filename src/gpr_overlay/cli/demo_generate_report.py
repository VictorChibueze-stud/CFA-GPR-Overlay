"""CLI demo to generate an AdvisoryReport from the GPR CSV and portfolio snapshot.

This script is intentionally minimal and uses hard-coded demo paths.
"""
# Example PowerShell command to run the demo manual event:
#
# python src/gpr_overlay/cli/demo_generate_report.py \
#   --manual-event-peak 2025-06-23 --manual-start-date 2025-06-01 --manual-end-date 2025-06-28 \
#   --portfolio-file data/fund/blkb_iq_responsible_equity_world_ex_ch_2025-09-30_gpr_sample.csv \
#   --output-report out/demo_report_worldexch_2025-06-23_advisory.json \
#   --output-holdings out/demo_report_worldexch_2025-06-23_holdings.json
from __future__ import annotations

from pathlib import Path
import json
import logging

from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv
import argparse
from datetime import datetime

from gpr_overlay.services.gpr_event_detection_service import (
    detect_gpr_events,
    select_event_for_target_date,
    ELEVATED_SPIKE_Q,
    EXTREME_SPIKE_Q,
    BUFFER_PRE_DAYS_DEFAULT,
    BUFFER_POST_DAYS_DEFAULT,
)
from gpr_overlay.data_models.gpr_event import GprEvent, GprEventType
from gpr_overlay.services.portfolio_overlay_service import (
    load_portfolio_snapshot_from_csv,
    compute_portfolio_industry_exposure,
)
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact
from gpr_overlay.services.advisory_service import build_advisory_report

logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Generate an AdvisoryReport JSON for a GPR event.")
    parser.add_argument("--event-date", dest="event_date", type=str, default=None,
                        help="Target date (YYYY-MM-DD) for which to generate an advisory. If omitted, latest event is used.")
    parser.add_argument("--manual-event-peak", dest="manual_event_peak", type=str, default=None,
                        help="Manual event peak date (YYYY-MM-DD) for demo override.")
    parser.add_argument("--manual-start-date", dest="manual_start_date", type=str, default=None,
                        help="Manual event start date (YYYY-MM-DD) for demo override.")
    parser.add_argument("--manual-end-date", dest="manual_end_date", type=str, default=None,
                        help="Manual event end date (YYYY-MM-DD) for demo override.")
    parser.add_argument("--portfolio-file", dest="portfolio_file", type=str, default=None,
                        help="Path to portfolio CSV to use instead of the demo fund CSV.")
    parser.add_argument("--output-report", dest="output_report", type=str, default=None,
                        help="If provided, write the AdvisoryReport JSON to this path.")
    parser.add_argument("--output-holdings", dest="output_holdings", type=str, default=None,
                        help="If provided, write holdings shortlists / criteria_matches JSON to this path.")
    parser.add_argument(
        "--holdings-mode",
        dest="holdings_mode",
        choices=("vulnerable", "resilient", "all"),
        default="all",
        help="Which industries to include in shortlists: vulnerable|resilient|all",
    )
    parser.add_argument("--per-industry", dest="per_industry", type=int, default=5,
                        help="Top N holdings per industry to include in shortlists (default 5).")
    parser.add_argument("--criteria-json", dest="criteria_json", type=str, default=None,
                        help="Path to JSON file with a list of criteria objects for criteria_matches (Flow1 or list).")
    args = parser.parse_args()

    data_root = Path("data")
    # Use the packaged sample GPR CSV by default and the raw portfolio template
    gpr_csv = data_root / "gpr_daily_sample.csv"
    default_fund_csv = data_root / "raw_portfolio_template.csv"
    fund_csv = Path(args.portfolio_file) if args.portfolio_file else default_fund_csv

    points = load_gpr_daily_from_csv(gpr_csv)
    events = detect_gpr_events(points)

    chosen_event = None
    # Manual override: if all three manual args are provided, construct a manual event
    if args.manual_event_peak and args.manual_start_date and args.manual_end_date:
        try:
            peak_date = datetime.strptime(args.manual_event_peak, "%Y-%m-%d").date()
            start_date = datetime.strptime(args.manual_start_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(args.manual_end_date, "%Y-%m-%d").date()
        except Exception:
            logger.error("Could not parse manual event dates. Use YYYY-MM-DD for all manual dates.")
            return

        # Build a pandas series from points to compute percentile
        import pandas as _pd

        df_pts = _pd.DataFrame([{"date": p.date, "gprd": float(p.gprd)} for p in points])
        df_pts = df_pts.sort_values("date").reset_index(drop=True)
        row = df_pts[df_pts["date"] == peak_date]
        if row.empty:
            logger.error("No GPR value found for manual peak date %s", peak_date.isoformat())
            return

        val = float(row.iloc[0]["gprd"]) if not _pd.isna(row.iloc[0]["gprd"]) else None
        if val is None:
            logger.error("GPR value at manual peak date is missing: %s", peak_date.isoformat())
            return

        # percentile fraction 0..1
        full = df_pts["gprd"].dropna().values
        pct = float((full <= val).sum()) / float(full.size) if full.size > 0 else 0.0

        if pct >= EXTREME_SPIKE_Q:
            ev_type = GprEventType.EXTREME_SPIKE
            label = "Extreme spike"
        elif pct >= ELEVATED_SPIKE_Q:
            ev_type = GprEventType.ELEVATED_SPIKE
            label = "Elevated spike"
        else:
            # If manual event doesn't meet spike thresholds, still allow manual injection as elevated
            ev_type = GprEventType.ELEVATED_SPIKE
            label = "Elevated spike"

        ev = GprEvent(
            event_id=f"manual-{peak_date.isoformat()}",
            event_type=ev_type,
            start_date=start_date,
            end_date=end_date,
            peak_date=peak_date,
            gpr_level_at_peak=val,
            gpr_delta_from_baseline=float(val - float(_pd.Series(full).median())) if full.size > 0 else 0.0,
            severity_score=float(pct),
            percentile=float(pct),
            label=label,
        )

        chosen_event = ev
    elif args.event_date:
        try:
            target_date = datetime.strptime(args.event_date, "%Y-%m-%d").date()
        except Exception:
            logger.error("Could not parse --event-date=%s. Use YYYY-MM-DD.", args.event_date)
            return

        chosen_event = select_event_for_target_date(events, target_date)
        if chosen_event is None:
            logger.warning("No events available to select for target date %s", target_date.isoformat())
            return
        logger.info("Selected event for %s: %s %s..%s (peak %s)",
                    target_date.isoformat(), chosen_event.event_type.value,
                    chosen_event.start_date, chosen_event.end_date, chosen_event.peak_date)
    else:
        # prefer last quantile/elevated/extreme spike, otherwise last short-term spike, otherwise last event
        recent_spikes = [e for e in events if e.event_type.name in ("ELEVATED_SPIKE", "EXTREME_SPIKE")]
        if not recent_spikes:
            recent_spikes = [e for e in events if e.event_type.name == "SHORT_TERM_SPIKE"]
        chosen_event = recent_spikes[-1] if recent_spikes else (events[-1] if events else None)

    if chosen_event is None:
        logger.error("No events detected from GPR series; exiting")
        return

    snapshot = load_portfolio_snapshot_from_csv(fund_csv)
    exposures = compute_portfolio_industry_exposure(snapshot)
    impact_profile = compute_event_portfolio_impact(chosen_event, exposures)
    report = build_advisory_report(snapshot, impact_profile)

    # Pydantic v2: use model_dump_json for stable JSON serialization
    report_json = report.model_dump_json(indent=2)
    if args.output_report:
        Path(args.output_report).write_text(report_json, encoding="utf-8")
        logger.info("Wrote advisory report to %s", args.output_report)
    else:
        print(report_json)

    # Optionally produce holdings shortlists and criteria_matches for Langflow
    if args.output_holdings:
        # Build holdings list used for shortlists and matches (include only allowed fields)
        holdings_list = []
        for h in snapshot.holdings:
            holdings_list.append(
                {
                    "security_name_report": h.security_name_report,
                    "weight_pct": h.weight_pct,
                    "fed_industry_name": h.fed_industry_name,
                    "region_guess": getattr(h, "region_guess", None),
                    "country_guess": getattr(h, "country_guess", None),
                }
            )

        # Determine industries to include based on holdings_mode using impact_profile
        sel_industry_names = set()
        if args.holdings_mode == "vulnerable":
            sel_industry_names = {it.fed_industry_name for it in impact_profile.vulnerable_industries}
        elif args.holdings_mode == "resilient":
            sel_industry_names = {it.fed_industry_name for it in impact_profile.resilient_industries}
        else:
            sel_industry_names = {it.fed_industry_name for it in (impact_profile.vulnerable_industries + impact_profile.resilient_industries)}

        # Group holdings by fed_industry_name and build top-N lists
        from collections import defaultdict
        by_ind = defaultdict(list)
        for item in holdings_list:
            name = item.get("fed_industry_name") or "__unknown__"
            if name in sel_industry_names:
                # Only include holdings whose industry is in the selected set
                by_ind[name].append(item)

        shortlists_by_industry = {}
        for ind_name, items in by_ind.items():
            # Sort by weight_pct descending, treat None as -inf so they go last
            def _weight_key(x):
                try:
                    return float(x.get("weight_pct") or 0.0)
                except Exception:
                    return 0.0

            items_sorted = sorted(items, key=_weight_key, reverse=True)
            shortlists_by_industry[ind_name] = items_sorted[: args.per_industry]

        # Criteria matching: parse criteria JSON if provided and generate deterministic matches
        import json as _json
        criteria_matches_list = []

        if args.criteria_json:
            raw = None
            try:
                raw = _json.loads(Path(args.criteria_json).read_text(encoding="utf-8"))
            except Exception:
                logger.exception("Could not read/parse criteria JSON %s", args.criteria_json)
                raw = None

            parsed_criteria = []
            if isinstance(raw, list):
                # Top-level list of criteria objects. Support keys: cluster_id, region_guess or region, industry_name
                for obj in raw:
                    cid = obj.get("cluster_id") or obj.get("criteria_id")
                    region = obj.get("region_guess") or obj.get("region")
                    ind = obj.get("industry_name")
                    if cid and region and ind:
                        parsed_criteria.append({"cluster_id": cid, "region_guess": region, "industry_name": ind})
            elif isinstance(raw, dict):
                # Flow1 raw format expected: contains channels_by_cluster list
                clusters = raw.get("channels_by_cluster") or raw.get("channels") or []
                for cl in clusters:
                    cid = cl.get("cluster_id")
                    region = cl.get("region")
                    channels = cl.get("economic_channels") or cl.get("channels") or []
                    for ch in channels:
                        linked = ch.get("linked_industries") or []
                        for li in linked:
                            ind = li.get("industry_name")
                            if cid and region and ind:
                                parsed_criteria.append({"cluster_id": cid, "region_guess": region, "industry_name": ind})

            # For each parsed criteria item, perform deterministic case-insensitive exact matching after strip
            for crit in parsed_criteria:
                matches = []
                for h in holdings_list:
                    h_region = (h.get("region_guess") or "").strip()
                    h_ind = (h.get("fed_industry_name") or "").strip()
                    if h_region.lower() == str(crit.get("region_guess") or "").strip().lower() and h_ind.lower() == str(crit.get("industry_name") or "").strip().lower():
                        matches.append(
                            {
                                "security_name_report": h.get("security_name_report"),
                                "weight_pct": h.get("weight_pct"),
                                "fed_industry_name": h.get("fed_industry_name"),
                                "region_guess": h.get("region_guess"),
                                "country_guess": h.get("country_guess"),
                            }
                        )
                criteria_matches_list.append(
                    {
                        "cluster_id": crit.get("cluster_id"),
                        "region_guess": crit.get("region_guess"),
                        "industry_name": crit.get("industry_name"),
                        "matched_holdings": matches,
                    }
                )

        # Build per-industry summaries from impact_profile
        industry_summaries = {}
        ind_by_name = {it.fed_industry_name: it for it in impact_profile.industries}
        for name, it in ind_by_name.items():
            industry_summaries[name] = {
                "industry_portfolio_weight": it.portfolio_weight,
                "industry_weight_share_of_portfolio": it.industry_weight_share_of_portfolio,
                "industry_weight_share_of_vulnerable": it.industry_weight_share_of_vulnerable,
            }

        # enrich shortlists with holding-level industry weight share (holding.weight / industry_portfolio_weight)
        for ind_name, items in shortlists_by_industry.items():
            ind_pw = ind_by_name.get(ind_name).portfolio_weight if ind_by_name.get(ind_name) is not None else 0.0
            for h in items:
                try:
                    hw = float(h.get("weight_pct") or 0.0)
                except Exception:
                    hw = 0.0
                h["industry_weight_share_for_holding"] = float(hw / ind_pw) if ind_pw > 0 else 0.0

        # Use a stable dict for event metadata: include full event object consistent with advisory report
        ev_obj = impact_profile.event.model_dump()
        # Ensure enum serialized to its value
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
            "vulnerability_composition": impact_profile.vulnerability_composition,
            "industry_summaries": industry_summaries,
            "mode": args.holdings_mode,
            "per_industry": int(args.per_industry),
            "shortlists_by_industry": shortlists_by_industry,
            "criteria_matches": criteria_matches_list,
        }

        Path(args.output_holdings).write_text(_json.dumps(holdings_output, indent=2, default=str), encoding="utf-8")
        logger.info("Wrote holdings shortlists to %s", args.output_holdings)


if __name__ == "__main__":
    main()
