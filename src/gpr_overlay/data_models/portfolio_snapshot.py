"""Portfolio snapshot models.

`PortfolioSnapshot` represents a single fund snapshot as of a date and the
list of holdings. `PortfolioHolding` stores the per-holding attributes
extracted from BLKB reports and mapping to Fed industry identifiers.
"""
from __future__ import annotations

from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class PortfolioHolding(BaseModel):
    """A single holding entry from a fund snapshot.

    Most fields come directly from the BLKB CSV mapping between the fund
    report and the Fed GPR industries.
    """

    security_name_report: str
    ticker_guess: Optional[str] = None
    isin_guess: Optional[str] = None
    sector_raw: Optional[str] = None
    weight_pct: float
    market_value_raw: Optional[str] = None

    fed_industry_name: Optional[str] = None
    fed_industry_id: Optional[str] = None
    gpr_beta: Optional[float] = None
    gpr_sentiment: Optional[float] = None
    # Optional inferred/geocoding hints present in newer CSV formats
    region_guess: Optional[str] = None
    country_guess: Optional[str] = None

    mapping_confidence: Optional[float] = None
    mapping_rationale_short: Optional[str] = None


class PortfolioSnapshot(BaseModel):
    """A fund-level snapshot consisting of multiple holdings.

    Attributes:
        fund_name: Official fund name.
        as_of_date: Snapshot date.
        holdings: List of `PortfolioHolding`.
    """

    fund_name: str
    as_of_date: date
    holdings: List[PortfolioHolding] = Field(default_factory=list)
