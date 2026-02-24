"""GPR time series point model.

One daily observation of the Global Geopolitical Risk (GPR) index.

This corresponds to a single row in `data/raw/gpr_daily_original/gpr_daily_recent.csv`.
"""
from __future__ import annotations

from pydantic import BaseModel
from datetime import date
from typing import Optional


class GprDailyPoint(BaseModel):
    """One daily observation of the Global Geopolitical Risk (GPR) index.

    Fields map to columns in the original CSV. Snake_case names are used in
    the Python model; loader functions will map CSV column names to these fields.
    """

    date: date
    n10d: Optional[float]
    gprd: float
    gprd_act: Optional[float] = None
    gprd_threat: Optional[float] = None
    gprd_ma30: Optional[float] = None
    gprd_ma7: Optional[float] = None
    event: Optional[str] = None
