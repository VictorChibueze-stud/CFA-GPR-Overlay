from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class GprEventType(str, Enum):
    """
    Type of GPR event detected from the daily GPR time series.
    """

    SHORT_TERM_SPIKE = "short_term_spike"
    EPISODE = "episode"
    REGIME = "regime"
    ELEVATED_SPIKE = "elevated_spike"
    EXTREME_SPIKE = "extreme_spike"


class GprEvent(BaseModel):
    """
    A period of elevated geopolitical risk derived from the GPR time series.

    This can be:
    - a short-term spike (one or a few days),
    - an episode (cluster of high GPR readings),
    - a regime (longer stretch of structurally high GPR).

    The event attributes are designed to be human-explainable
    and usable as triggers for downstream analysis and advisory.
    """

    event_id: str
    event_type: GprEventType

    start_date: date
    end_date: Optional[date]  # end_date can equal start_date for one-day spikes
    peak_date: date

    gpr_level_at_peak: float
    gpr_delta_from_baseline: float  # peak - baseline (baseline defined per event type)
    severity_score: float           # simple 0–1 or 0–10 style score
    # Normalised severity score in range [0, 1].
    # 0 means negligible event; 1 means a very strong event for this detection method.
    # All downstream functions assume severity_score ∈ [0, 1].
    percentile: float               # percentile of the peak GPR in the historical distribution (0.0–1.0)

    # Optional human-readable label or tag (e.g. "High spike", "Prolonged stress")
    label: Optional[str] = None
