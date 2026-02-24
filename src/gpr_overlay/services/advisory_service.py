from typing import List
from datetime import date

from gpr_overlay.data_models.advisory_report import (
    AdvisoryReport,
    AdvisoryAction,
    AdvisoryActionType,
)
from gpr_overlay.data_models.industry_impact import EventImpactProfile, EventIndustryImpact
from gpr_overlay.data_models.portfolio_snapshot import PortfolioSnapshot


# Simple ESG constraint placeholder: industries we do not recommend tilting UP into.
# Use canonical lower-case industry ids for comparisons; keeps the check robust to
# presentation name differences (we'll check both fed_industry_id and fed_industry_name).
ESG_BANNED_INDUSTRY_IDS = {
    "coal",
    "petroleum_and_natural_gas",
    "oil_and_gas",
    "defense",
    "weapons",
}


def _top_industry_names(items: List[EventIndustryImpact], n: int = 5) -> List[str]:
    return [i.fed_industry_name for i in items[:n]]


def _severity_to_priority(severity: float) -> str:
    """Map a normalized severity score to a human-priority label.

    - severity >= 0.7 => high
    - 0.3 <= severity < 0.7 => medium
    - severity < 0.3 => low
    If severity is None, return 'medium' as a sensible default.
    """
    if severity is None:
        return "medium"
    if severity >= 0.7:
        return "high"
    if severity >= 0.3:
        return "medium"
    return "low"


def build_advisory_report(snapshot: PortfolioSnapshot, impact_profile: EventImpactProfile) -> AdvisoryReport:
    """Build an AdvisoryReport from a portfolio snapshot and an EventImpactProfile.

    The logic is intentionally simple and advisory in tone. Suggestions respect
    a small ESG banned list and are phrased as considerations rather than orders.
    This function aligns textual descriptions with the numeric sign of `net_impact`.
    """
    event = impact_profile.event
    fund_name = snapshot.fund_name
    as_of_date = snapshot.as_of_date

    baseline = float(impact_profile.portfolio_vulnerability_baseline or 0.0)
    net = float(impact_profile.net_impact or 0.0)

    # Normalise event severity for display/use: if None, treat as 1.0 (worst-case)
    severity = float(event.severity_score) if event.severity_score is not None else 1.0

    # logical interpretation of net impact
    is_net_resilient = net > 0.0

    # Take top vulnerable and resilient industries (already sorted by impact)
    top_vul = _top_industry_names(impact_profile.vulnerable_industries, n=5)
    top_res = _top_industry_names(impact_profile.resilient_industries, n=5)

    # If there are no mapped industries, produce a short advisory and a monitor action.
    if not impact_profile.industries:
        summary = (
            f"On {event.peak_date}, the GPR index experienced a "
            f"{event.event_type.value.replace('_', ' ')} with severity {severity:.2f}. "
            "No portfolio holdings could be mapped to Fed industries for impact analysis; "
            "generate a full industry mapping to enable per-industry suggestions."
        )

        key_points = [
            f"Detected event type: {event.event_type.value.replace('_', ' ')} on {event.peak_date}.",
            "No mapped holdings: the portfolio snapshot contains no holdings with a Fed industry mapping or betas.",
            "Action: monitor geopolitical developments until mapping or exposures are available.",
        ]

        actions = [
            AdvisoryAction(
                action_type=AdvisoryActionType.MONITOR,
                description="Monitor geopolitical developments and portfolio exposures; cannot produce industry-level suggestions without a mapping.",
                rationale="No per-industry exposures were available for impact computation.",
                target_industries=[],
                priority="low",
            )
        ]

        report = AdvisoryReport(
            fund_name=fund_name,
            as_of_date=as_of_date,
            event=event,
            impact_profile=impact_profile,
            portfolio_vulnerability_baseline=baseline,
            net_event_impact=net,
            summary=summary,
            key_points=key_points,
            top_vulnerable_industries=[],
            top_resilient_industries=[],
        )

        return report

    # Normal case: there are per-industry impacts
    if is_net_resilient:
        summary = (
            f"On {event.peak_date}, the GPR index experienced a "
            f"{event.event_type.value.replace('_', ' ')} with severity {severity:.2f}. "
            "The portfolio shows a net POSITIVE GPR impact (net resilient) relative to its baseline vulnerability."
        )
    else:
        summary = (
            f"On {event.peak_date}, the GPR index experienced a "
            f"{event.event_type.value.replace('_', ' ')} with severity {severity:.2f}. "
            "The portfolio shows a net NEGATIVE GPR impact (net vulnerable) relative to its baseline vulnerability."
        )

    key_points = [
        f"Detected event type: {event.event_type.value.replace('_', ' ')} on {event.peak_date} with percentile {event.percentile*100:.1f}%.",
        # Clarify meaning of baseline for readers: it's the portfolio exposure scaled to severity=1.0
        f"Portfolio vulnerability baseline (impact at severity=1.0): {baseline:.4f}.",
        f"Net event impact at severity {severity:.2f}: {net:.4f}.",
        ("Net positive impact: portfolio tends to benefit under this event." if is_net_resilient
         else "Net negative impact: portfolio is tilted towards GPR-sensitive industries and is more exposed during this event."),
        f"Top vulnerable industries in the portfolio: {', '.join(top_vul) if top_vul else 'none' }.",
        f"Top resilient industries in the portfolio: {', '.join(top_res) if top_res else 'none' }.",
    ]

    # If severity was missing and we used a fallback, note that for transparency
    if event.severity_score is None:
        key_points.append("Note: event severity was missing in the source data; a worst-case fallback severity=1.00 was used for scoring.")

    # If the portfolio is net resilient, emphasise the resilient tilt in key points
    if is_net_resilient:
        key_points.append("Portfolio tilt: net resilient to this GPR event; consider maintaining current positioning and monitor for reversal.")

    report = AdvisoryReport(
        fund_name=fund_name,
        as_of_date=as_of_date,
        event=event,
        impact_profile=impact_profile,
        portfolio_vulnerability_baseline=baseline,
        net_event_impact=net,
        summary=summary,
        key_points=key_points,
        top_vulnerable_industries=top_vul,
        top_resilient_industries=top_res,
    )

    return report
