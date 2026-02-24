from typing import List
import logging

import math

from gpr_overlay.data_models.gpr_event import GprEvent
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from gpr_overlay.data_models.industry_impact import (
    EventImpactProfile,
    EventIndustryImpact,
)
from gpr_overlay.services.portfolio_overlay_service import (
    compute_portfolio_gpr_vulnerability,
)

logger = logging.getLogger(__name__)
EPS = 1e-8


def compute_event_portfolio_impact(
    event: GprEvent,
    exposures: List[IndustryExposure],
) -> EventImpactProfile:
    """Compute an EventImpactProfile for a given GprEvent and portfolio exposures.

    The impact metric is intentionally simple and explainable:
        impact_score = event.severity_score * (portfolio_weight / 100.0) * gpr_beta

    Direction is derived from the sign of gpr_beta.
    """
    severity = event.severity_score
    if severity is None:
        logger.warning("GprEvent.severity_score is None; defaulting to 1.0 for impact calculation.")
        severity = 1.0
    else:
        severity = float(severity)

    industries: List[EventIndustryImpact] = []
    total_negative = 0.0
    total_positive = 0.0

    for e in exposures:
        # skip industries with no weight or missing beta
        try:
            pw = float(e.portfolio_weight)
        except Exception:
            continue
        if pw <= 0.0 or e.gpr_beta is None:
            continue

        beta = float(e.gpr_beta)
        impact = severity * (pw / 100.0) * beta

        if beta < -EPS:
            direction = "negative"
            total_negative += impact
        elif beta > EPS:
            direction = "positive"
            total_positive += impact
        else:
            direction = "neutral"

        contrib = e.contribution_to_vulnerability if e.contribution_to_vulnerability is not None else (pw / 100.0) * beta

        industries.append(
            EventIndustryImpact(
                fed_industry_id=e.fed_industry_id,
                fed_industry_name=e.fed_industry_name,
                portfolio_weight=pw,
                gpr_beta=beta,
                impact_score=float(impact),
                direction=direction,
                gpr_sentiment=e.gpr_sentiment,
                contribution_to_vulnerability=float(contrib) if contrib is not None else None,
            )
        )

    # Sort vulnerable and resilient lists by absolute impact descending
    vulnerable = [i for i in industries if i.direction == "negative"]
    resilient = [i for i in industries if i.direction == "positive"]

    vulnerable.sort(key=lambda x: abs(x.impact_score), reverse=True)
    resilient.sort(key=lambda x: abs(x.impact_score), reverse=True)

    net = total_positive + total_negative

    baseline = compute_portfolio_gpr_vulnerability(exposures)

    profile = EventImpactProfile(
        event=event,
        industries=industries,
        vulnerable_industries=vulnerable,
        resilient_industries=resilient,
        total_negative_impact=float(total_negative),
        total_positive_impact=float(total_positive),
        net_impact=float(net),
        portfolio_vulnerability_baseline=float(baseline),
    )

    # Compute composition metrics and per-industry shares
    total_portfolio_weight = sum([it.portfolio_weight for it in industries]) if industries else 0.0
    total_vulnerable_weight = sum([it.portfolio_weight for it in vulnerable]) if vulnerable else 0.0

    # Avoid division by zero
    for it in profile.industries:
        try:
            it_ind = it
            if total_portfolio_weight > 0:
                it_ind.industry_weight_share_of_portfolio = float(it_ind.portfolio_weight / total_portfolio_weight)
            else:
                it_ind.industry_weight_share_of_portfolio = 0.0

            if total_vulnerable_weight > 0 and it_ind.direction == "negative":
                it_ind.industry_weight_share_of_vulnerable = float(it_ind.portfolio_weight / total_vulnerable_weight)
            else:
                it_ind.industry_weight_share_of_vulnerable = 0.0
        except Exception:
            continue

    vulnerable_count = len(vulnerable)
    total_count = len(industries)
    vulnerable_weight_share = float(total_vulnerable_weight / total_portfolio_weight) if total_portfolio_weight > 0 else 0.0

    profile.vulnerability_composition = {
        "vulnerable_weight_share": float(vulnerable_weight_share),
        "non_vulnerable_weight_share": float(1.0 - vulnerable_weight_share),
        "vulnerable_industry_count": int(vulnerable_count),
        "total_industry_count": int(total_count),
        "vulnerable_industry_share": float(vulnerable_count / total_count) if total_count > 0 else 0.0,
        "non_vulnerable_industry_share": float(1.0 - (vulnerable_count / total_count)) if total_count > 0 else 0.0,
    }

    return profile
