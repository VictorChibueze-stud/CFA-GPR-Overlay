from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel

from gpr_overlay.data_models.gpr_event import GprEvent
from gpr_overlay.data_models.industry_exposure import IndustryExposure


class EventIndustryImpact(BaseModel):
    """
    Impact of a single GPR event on one portfolio industry.

    This ties together the portfolio weight, industry's GPR beta, event severity,
    and a simple impact score.
    """

    fed_industry_id: str
    fed_industry_name: str

    portfolio_weight: float         # weight (%) of the portfolio in this industry
    gpr_beta: float                 # industry's GPR beta

    impact_score: float             # numeric score combining weight, beta, and event severity
    direction: str                  # "negative", "positive", or "neutral"

    # Optional convenience fields
    gpr_sentiment: Optional[float] = None
    contribution_to_vulnerability: Optional[float] = None
    # share of this industry's portfolio weight relative to the entire portfolio (0.0-1.0)
    industry_weight_share_of_portfolio: Optional[float] = None
    # share of this industry's weight relative to total vulnerable weight (0.0-1.0) if industry is vulnerable
    industry_weight_share_of_vulnerable: Optional[float] = None


class EventImpactProfile(BaseModel):
    """
    Impact profile of a single GPR event on a portfolio.

    Contains the event, per-industry impacts, sorted views and summary metrics.
    """

    event: GprEvent

    industries: List[EventIndustryImpact]

    vulnerable_industries: List[EventIndustryImpact]
    resilient_industries: List[EventIndustryImpact]

    total_negative_impact: float
    total_positive_impact: float
    net_impact: float
    portfolio_vulnerability_baseline: Optional[float] = None
    # vulnerability composition summary (fractions 0.0-1.0 and counts)
    vulnerability_composition: Optional[dict] = None
