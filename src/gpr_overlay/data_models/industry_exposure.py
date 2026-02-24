from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class IndustryExposure(BaseModel):
    """Aggregated portfolio exposure to a single Fed GPR industry.

    This model captures the combined weight and average GPR sensitivity for
    all holdings mapped to a single Fed industry identifier.
    """

    fed_industry_id: str
    fed_industry_name: str

    # Total weight in the portfolio expressed as a percentage (0-100)
    portfolio_weight: float
    benchmark_weight: Optional[float] = None

    # Industry GPR beta (weighted average when computed from multiple holdings)
    gpr_beta: float
    gpr_sentiment: Optional[float] = None

    # Convenience field filled by the vulnerability computation
    contribution_to_vulnerability: Optional[float] = None