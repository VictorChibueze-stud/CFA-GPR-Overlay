from pathlib import Path
from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv


def test_load_gpr_daily_from_csv_basic():
    csv_path = Path("data/raw/gpr_daily_original/gpr_daily_recent.csv")
    points = load_gpr_daily_from_csv(csv_path)

    # Basic sanity checks
    assert len(points) > 0
    first = points[0]
    from datetime import date as _date

    assert isinstance(first.date, _date)
    assert isinstance(first.gprd, float)
