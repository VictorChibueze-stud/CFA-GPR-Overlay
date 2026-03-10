"""
GPR Intelligence API.

FastAPI application with:
- Async lifespan management for APScheduler
- Weekly GPR sync cron job (Monday 07:00 UTC)
- Health and GPR status endpoints
- Full analysis pipeline endpoints (GprIngest → EventDetection → Portfolio → Impact)

Pipeline call order (from demo.py):
  1. load_gpr_daily_from_csv(csv_path) → list[GprDailyPoint]
  2. detect_gpr_events(series) → list[GprEvent]
  3. load_portfolio_snapshot_from_csv(csv_path) → PortfolioSnapshot
  4. compute_portfolio_industry_exposure(snapshot) → list[IndustryExposure]
  5. compute_event_portfolio_impact(event, exposures) → EventImpactProfile
  6. build_advisory_report(snapshot, impact_profile) → AdvisoryReport
"""

import asyncio
import logging
import json as _json
import glob
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from api.jobs.gpr_sync import sync_gpr_data, get_sync_status

# ── Data paths ──────────────────────────────────────────────────────────────

_REPO_ROOT       = Path(__file__).resolve().parents[1]
# Sync job writes to this location (see api/jobs/gpr_sync.py)
_GPR_CSV         = _REPO_ROOT / "dashboard" / "public" / "data" / "gpr_daily.csv"
_PORTFOLIO_CSV   = _REPO_ROOT / "dashboard" / "public" / "data" / "portfolio_default.csv"
_ADVISORY_OUT    = _REPO_ROOT / "out"

# Add src to path once at module level for service imports
import sys as _sys
_sys.path.insert(0, str(_REPO_ROOT / "src"))

# Now safe to import services
from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv
from gpr_overlay.services.gpr_event_detection_service import (
    detect_gpr_events,
    select_event_for_target_date,
)
from gpr_overlay.services.portfolio_overlay_service import (
    load_portfolio_snapshot_from_csv,
    compute_portfolio_industry_exposure,
)
from gpr_overlay.services.industry_impact_service import compute_event_portfolio_impact
from gpr_overlay.services.advisory_service import build_advisory_report

# ── Constants ────────────────────────────────────────────────────────────────

PRESET_YEARS = {"1Y": 1, "3Y": 3, "5Y": 5, "2020+": None, "ALL": None}

REQUIRED_PORTFOLIO_COLUMNS = {
    "security_name_report",
    "weight_pct",
    "fed_industry_id",
    "fed_industry_name",
}

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# ────────────────────────────────────────────────────────────────────────────
# Scheduler setup
# ────────────────────────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Handles startup and shutdown of the scheduler.
    """
    # Startup: run sync once, then schedule weekly
    logger.info("Starting GPR Intelligence API")
    
    # Non-blocking startup sync (background task)
    asyncio.create_task(sync_gpr_data())

    # Schedule every Monday at 07:00 UTC
    scheduler.add_job(
        sync_gpr_data,
        CronTrigger(
            day_of_week="mon",
            hour=7,
            minute=0,
            timezone="UTC",
        ),
        id="gpr_weekly_sync",
        replace_existing=True,
        max_instances=1,        # prevent overlap if job runs long
        misfire_grace_time=3600,  # 1h grace if server was down at 07:00
    )
    scheduler.start()
    logger.info("GPR sync scheduler started; next run: Monday 07:00 UTC")

    yield  # app runs here

    # Shutdown: stop the scheduler gracefully
    logger.info("Shutting down GPR Intelligence API")
    scheduler.shutdown(wait=False)


# ────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GPR Intelligence API",
    description="Geopolitical Risk analysis with portfolio impact insights",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dashboard may be on different port/host
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────────────────────────────────────
# Helper functions
# ────────────────────────────────────────────────────────────────────────────

def _run_full_pipeline(portfolio_csv: str) -> dict:
    """
    Runs the full analysis pipeline on a portfolio CSV.
    Mirrors demo.py exactly — same call order, same arguments.
    Returns a dict safe for JSON serialization.
    """
    series = load_gpr_daily_from_csv(_GPR_CSV)
    events = detect_gpr_events(series)

    # Use the most recent event as the active event
    active_event = events[-1] if events else None
    if active_event is None:
        raise HTTPException(
            status_code=404,
            detail="No GPR events detected"
        )

    # Call portfolio and impact services
    snapshot = load_portfolio_snapshot_from_csv(portfolio_csv)
    exposures = compute_portfolio_industry_exposure(snapshot)
    impact = compute_event_portfolio_impact(active_event, exposures)
    report = build_advisory_report(snapshot, impact)

    # Serialize using Pydantic v2 .model_dump()
    return {
        "event": active_event.model_dump(),
        "impact": impact.model_dump(),
        "report": report.model_dump(),
    }


# ────────────────────────────────────────────────────────────────────────────
# Health & Status endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """
    Health check endpoint.
    Includes GPR sync status for dashboard freshness indicator.
    """
    sync = get_sync_status()
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gpr_last_synced": sync.get("last_synced"),
        "gpr_last_date": sync.get("last_date"),
        "gpr_rows": sync.get("rows_written"),
    }


@app.get("/api/gpr/sync-status")
def gpr_sync_status():
    """
    Returns the last GPR sync result.
    Used by the dashboard topbar to show data freshness.
    """
    return get_sync_status()


# ────────────────────────────────────────────────────────────────────────────
# GPR Series & Latest endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/api/gpr/series")
def gpr_series(preset: str = "5Y"):
    """
    Returns GPR time series filtered by preset.
    Used by GPRChart component.

    Response schema:
      {
        data: [{ date, gprd, gprd_ma7, gprd_ma30 }],
        spike_dates: [str],
        preset: str,
        total_rows: int
      }
    """
    try:
        series = load_gpr_daily_from_csv(_GPR_CSV)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="GPR CSV not found")

    # Filter by preset
    if preset in ("1Y", "3Y", "5Y"):
        years = PRESET_YEARS[preset]
        cutoff = datetime.now(timezone.utc) - timedelta(days=365 * years)
        series = [p for p in series if p.date >= cutoff.date()]
    elif preset == "2020+":
        series = [p for p in series if p.date >= date(2020, 1, 1)]
    # "ALL" → no filter

    try:
        events = detect_gpr_events(series)
        spike_dates = [str(e.peak_date) for e in events]
    except Exception:
        spike_dates = []

    return {
        "data": [
            {
                "date":      str(p.date),
                "gprd":      p.gprd,
                "gprd_ma7":  p.gprd_ma7,
                "gprd_ma30": p.gprd_ma30,
            }
            for p in series
        ],
        "spike_dates": spike_dates,
        "preset": preset,
        "total_rows": len(series),
    }


@app.get("/api/gpr/latest")
def gpr_latest():
    """
    Returns the most recent GPR data point + active event if any.
    Used by the dashboard topbar badge and EventSummaryCard.

    Response schema:
      {
        date: str,
        gprd: float,
        percentile: float,
        is_spike: bool,
        status: "EXTREME_SPIKE" | "ELEVATED" | "NORMAL",
        active_event: { ... } | null
      }
    """
    try:
        series = load_gpr_daily_from_csv(_GPR_CSV)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="GPR CSV not found")

    if not series:
        raise HTTPException(status_code=500, detail="No GPR data available")

    latest = series[-1]

    try:
        events = detect_gpr_events(series)
    except Exception:
        events = []

    # Active event = most recent event whose peak_date is within 30 days
    active = None
    for e in reversed(events):
        if (latest.date - e.peak_date).days <= 30:
            active = e
            break

    # Compute percentile from the series
    sorted_vals = sorted(p.gprd for p in series)
    try:
        rank = sorted_vals.index(latest.gprd)
        percentile = rank / len(sorted_vals)
    except (ValueError, ZeroDivisionError):
        percentile = 0.5

    # Derive status from percentile
    if percentile >= 0.995:
        status = "EXTREME_SPIKE"
    elif percentile >= 0.99:
        status = "ELEVATED"
    else:
        status = "NORMAL"

    return {
        "date": str(latest.date),
        "gprd": latest.gprd,
        "percentile": round(percentile, 4),
        "is_spike": percentile >= 0.99,
        "status": status,
        "active_event": active.model_dump() if active else None,
    }


# ────────────────────────────────────────────────────────────────────────────
# Impact analysis endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/api/impact")
def get_impact():
    """
    Runs full pipeline on default portfolio CSV.
    Returns impact analysis with event, impact profile, and advisory report.
    """
    try:
        return _run_full_pipeline(str(_PORTFOLIO_CSV))
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Data file not found: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/impact/upload")
async def upload_impact(file: UploadFile = File(...)):
    """
    Accepts a CSV upload, runs full pipeline, returns impact analysis.
    Validates required columns before running pipeline.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()

    # Quick column validation before writing to disk
    import io
    import csv as csv_mod

    try:
        header = next(csv_mod.reader(io.StringIO(contents.decode("utf-8"))))
        missing = REQUIRED_PORTFOLIO_COLUMNS - set(header)
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Missing required columns: {sorted(missing)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")

    # Write to temp file and run pipeline
    try:
        with NamedTemporaryFile(suffix=".csv", delete=False, mode="wb") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        return _run_full_pipeline(tmp_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ────────────────────────────────────────────────────────────────────────────
# Advisory endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/api/advisory")
def get_advisory():
    """
    Returns the latest cached advisory report from the out/ directory.
    Falls back to running the pipeline if no cached file exists.
    """
    # Find most recent JSON file in out/ directory
    out_files = sorted(
        glob.glob(str(_ADVISORY_OUT / "advisory_*.json")),
        key=os.path.getmtime,
        reverse=True
    )

    if out_files:
        try:
            with open(out_files[0]) as f:
                return _json.load(f)
        except Exception as e:
            logger.warning("Failed to load cached advisory: %s", e)

    # Fallback: run pipeline
    try:
        result = _run_full_pipeline(str(_PORTFOLIO_CSV))
        return result["report"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate advisory: {str(e)}")
