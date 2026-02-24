"""GPR ingestion service.

Provides functions to read CSV exports from Caldara & Iacoviello and return
typed `GprDailyPoint` objects suitable for storage.
"""
from __future__ import annotations

from pathlib import Path
from typing import List
import logging

import pandas as pd

from gpr_overlay.data_models.gpr_series import GprDailyPoint


logger = logging.getLogger(__name__)


def ingest_gpr_from_csv(csv_path: Path) -> List[GprDailyPoint]:
    """Read a raw GPR CSV and return a list of `GprDailyPoint`.

    This is intentionally minimal: parsing and column mapping will be
    implemented later. For now this function reads the CSV and maps
    obvious columns if present.
    """

    df = pd.read_csv(csv_path)
    points: List[GprDailyPoint] = []

    # Minimal mapping - TODO: robust parsing
    for _, row in df.iterrows():
        point = GprDailyPoint(
            date=pd.to_datetime(row["date"]).date() if "date" in row else None,  # type: ignore[arg-type]
            gprd=float(row["gprd"]) if "gprd" in row and not pd.isna(row["gprd"]) else 0.0,
        )
        points.append(point)

    return points


def store_gpr_series(points: List[GprDailyPoint], repository) -> None:
    """Store a list of GPR points using a repository (e.g., MongoGprRepository).

    Args:
        points: List of typed GPR points.
        repository: Repository implementing `upsert_gpr_daily_series`.
    """

    # Repository integration is left as a simple call so it can be tested
    # or swapped out easily.
    repository.upsert_gpr_daily_series(points)


def load_gpr_daily_from_csv(csv_path: Path | str) -> List[GprDailyPoint]:
    """Load the cleaned GPR daily CSV into a list of GprDailyPoint objects.

    Parameters
    ----------
    csv_path : Path | str
        Path to data/raw/gpr_daily_original/gpr_daily_recent.csv
        or any other CSV file with the same column structure.

    Returns
    -------
    List[GprDailyPoint]
        List of daily GPR observations, one per row in the CSV.
    """

    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"GPR CSV file not found: {path}")

    df = pd.read_csv(path)

    # Normalise column names to upper-case to be robust
    df.columns = [str(c).strip().upper() for c in df.columns]

    required_cols = {"DATE", "GPRD"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in GPR CSV: {missing}")

    points: List[GprDailyPoint] = []

    for _, row in df.iterrows():
        point = GprDailyPoint(
            date=pd.to_datetime(row["DATE"]).date(),
            n10d=float(row["N10D"]) if "N10D" in df.columns and pd.notna(row["N10D"]) else None,
            gprd=float(row["GPRD"]),
            gprd_act=float(row["GPRD_ACT"]) if "GPRD_ACT" in df.columns and pd.notna(row["GPRD_ACT"]) else None,
            gprd_threat=float(row["GPRD_THREAT"]) if "GPRD_THREAT" in df.columns and pd.notna(row["GPRD_THREAT"]) else None,
            gprd_ma30=float(row["GPRD_MA30"]) if "GPRD_MA30" in df.columns and pd.notna(row["GPRD_MA30"]) else None,
            gprd_ma7=float(row["GPRD_MA7"]) if "GPRD_MA7" in df.columns and pd.notna(row["GPRD_MA7"]) else None,
            event=str(row["EVENT"]) if "EVENT" in df.columns and pd.notna(row["EVENT"]) else None,
        )
        points.append(point)

    logger.info("Loaded %d GPR daily points from %s", len(points), path)
    return points
