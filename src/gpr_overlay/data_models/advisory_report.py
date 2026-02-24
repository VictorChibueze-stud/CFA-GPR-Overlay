from __future__ import annotations

from datetime import date
from typing import List, Optional
from pydantic import BaseModel

from gpr_overlay.data_models.gpr_event import GprEvent
from gpr_overlay.data_models.industry_impact import EventImpactProfile


class AdvisoryActionType:
    """Plain-string container for advisory action types."""

    TILT_DOWN = "tilt_down"
    TILT_UP = "tilt_up"
    HEDGE = "hedge"
    MONITOR = "monitor"


class AdvisoryAction(BaseModel):
    action_type: str
    description: str
    rationale: str
    target_industries: List[str] = []
    priority: Optional[str] = None


class AdvisoryReport(BaseModel):
    fund_name: str
    as_of_date: date

    event: GprEvent
    impact_profile: EventImpactProfile

    portfolio_vulnerability_baseline: float
    net_event_impact: float

    summary: str
    key_points: List[str]

    top_vulnerable_industries: List[str]
    top_resilient_industries: List[str]

