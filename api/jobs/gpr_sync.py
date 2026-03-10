"""
GPR Daily Index sync job.

Source: https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xlsx
Cadence: Every Monday 07:00 UTC (site updates Mondays).
Strategy: Full replace — download entire file, validate, atomic write.
  Rationale: file is ~500KB; GPR data receives historical revisions
  so append-only would miss corrections.

Contract: The Excel file contains columns DAY|DATE (YYYYMMDD int), GPRD, GPRD_ACT|GPRD_AC,
GPRD_THREAT|GPRD_TH, N10D, with optional GPRD_MA30, GPRD_MA7, EVENT pre-computed. The
convert_gpr_excel_to_csv module (normalize column names to uppercase, parse dates to YYYY-MM-DD
strings, compute rolling averages if absent) produces a CSV with exact columns [N10D, GPRD,
GPRD_ACT, GPRD_THREAT, date, GPRD_MA30, GPRD_MA7, event] ready for gpr_ingestion_service,
which expects DATE, GPRD (required), and optional N10D, GPRD_ACT, GPRD_THREAT, GPRD_MA30,
GPRD_MA7, EVENT (all case-insensitive). This contract is enforced via validation checks
(row count ≥ MIN_EXPECTED_ROWS, no regression in row count or last date) before atomic replace.
"""

import os
import json
import logging
import asyncio
import tempfile
import shutil
from datetime import datetime, timezone
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

SOURCE_URL = (
    "https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xlsx"
)

# Resolve paths relative to repo root, not this file's location.
# Adjust if your directory layout differs — read demo.py to confirm.
REPO_ROOT   = Path(__file__).resolve().parents[2]
EXCEL_CACHE = REPO_ROOT / "api" / "state" / "data_gpr_daily_recent.xlsx"
CSV_OUT     = REPO_ROOT / "dashboard" / "public" / "data" / "gpr_daily.csv"
STATE_FILE  = REPO_ROOT / "api" / "state" / "sync_state.json"

DOWNLOAD_TIMEOUT_S  = 30
RETRY_COUNT         = 3
RETRY_BACKOFF_S     = 30
MIN_EXPECTED_ROWS   = 5000  # file had 5044 rows as of March 2026


# ── State persistence ────────────────────────────────────────────────────────

def _load_state() -> dict:
    """
    Load persisted sync state from STATE_FILE.
    Returns empty dict if file does not exist.
    State schema:
      last_synced:   ISO-8601 UTC string of last successful sync
      rows_written:  int
      last_date:     string — last date value in the CSV (YYYY-MM-DD)
      last_error:    string | null — last failure message
    """
    try:
        return json.loads(STATE_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def get_sync_status() -> dict:
    """
    Public accessor for the /health and /api/gpr/sync-status endpoints.
    Always returns a dict — never raises.
    """
    state = _load_state()
    return {
        "last_synced":  state.get("last_synced"),
        "rows_written": state.get("rows_written"),
        "last_date":    state.get("last_date"),
        "last_error":   state.get("last_error"),
        "csv_exists":   CSV_OUT.exists(),
    }


# ── Download ─────────────────────────────────────────────────────────────────

async def _download_excel(dest: Path) -> bool:
    """
    Download SOURCE_URL to dest.
    Retries RETRY_COUNT times with RETRY_BACKOFF_S seconds between attempts.
    Returns True on success, False if all retries exhausted.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, RETRY_COUNT + 1):
        try:
            async with httpx.AsyncClient(
                timeout=DOWNLOAD_TIMEOUT_S,
                follow_redirects=True,
            ) as client:
                logger.info(
                    "GPR sync: download attempt %d/%d", attempt, RETRY_COUNT
                )
                resp = await client.get(SOURCE_URL)
                resp.raise_for_status()
                dest.write_bytes(resp.content)
                logger.info(
                    "GPR sync: downloaded %d bytes", len(resp.content)
                )
                return True
        except Exception as exc:
            logger.warning("GPR sync: attempt %d failed: %s", attempt, exc)
            if attempt < RETRY_COUNT:
                await asyncio.sleep(RETRY_BACKOFF_S)

    return False


# ── Convert ──────────────────────────────────────────────────────────────────

def _convert_excel_to_csv(excel_path: Path, csv_path: Path) -> int:
    """
    Convert the downloaded Excel to CSV using the same logic as
    convert_gpr_excel_to_csv.py.

    Imports and calls the conversion function from the existing script.

    Returns: number of data rows written (excluding header).
    """
    # Import path setup — convert_gpr_excel_to_csv.py is at repo root in src/gpr_overlay/cli/
    import sys
    sys.path.insert(0, str(REPO_ROOT / "src"))
    from gpr_overlay.cli.convert_gpr_excel_to_csv import convert

    return convert(str(excel_path), str(csv_path))


# ── Validate ─────────────────────────────────────────────────────────────────

def _validate(new_csv: Path, prev_state: dict) -> tuple[bool, str]:
    """
    Sanity-check the newly written CSV before committing it.

    Rules:
    1. Row count >= MIN_EXPECTED_ROWS
    2. Row count >= previous rows_written - 10
       (allow small fluctuations but not truncation)
    3. Last date in new file >= last date in previous state
       (no regression — new file must not end earlier than old one)

    Returns (ok: bool, reason: str).
    reason is empty string on success.
    """
    import csv

    rows = []
    with open(new_csv, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    row_count = len(rows)

    if row_count < MIN_EXPECTED_ROWS:
        return False, f"row count {row_count} below minimum {MIN_EXPECTED_ROWS}"

    prev_rows = prev_state.get("rows_written", 0)
    if prev_rows and row_count < prev_rows - 10:
        return False, (
            f"row count {row_count} is more than 10 below "
            f"previous {prev_rows} — possible truncation"
        )

    # Last date check — read the 'date' column from the last row
    # Adjust column name to match actual CSV output of the converter.
    last_row = rows[-1]
    date_col = next(
        (k for k in last_row if k.lower() in ("date", "day")), None
    )
    if date_col and (prev_last := prev_state.get("last_date")):
        new_last = last_row[date_col]
        if new_last < prev_last:
            return False, (
                f"last date {new_last!r} regressed from {prev_last!r}"
            )

    return True, ""


# ── Orchestrator ─────────────────────────────────────────────────────────────

async def sync_gpr_data() -> dict:
    """
    Full sync pipeline. Safe to call at any time — will not corrupt
    the existing CSV if any step fails.

    Pipeline:
      1. Download Excel to a temp file
      2. Convert to CSV in a second temp file
      3. Validate the new CSV
      4. Atomic replace: os.replace(tmp_csv, CSV_OUT)
      5. Persist state

    Returns the result dict (same schema as get_sync_status()).
    """
    enabled = os.getenv("GPR_SYNC_ENABLED", "true").lower()
    if enabled != "true":
        logger.info("GPR sync: disabled via GPR_SYNC_ENABLED env var")
        return get_sync_status()

    prev_state = _load_state()
    logger.info("GPR sync: starting")

    # Temp files — cleaned up regardless of outcome
    tmp_excel = Path(tempfile.mktemp(suffix=".xlsx"))
    tmp_csv   = Path(tempfile.mktemp(suffix=".csv"))

    try:
        # Step 1 — Download
        ok = await _download_excel(tmp_excel)
        if not ok:
            err = "download failed after all retries"
            logger.error("GPR sync: %s", err)
            _save_state({**prev_state, "last_error": err})
            return get_sync_status()

        # Step 2 — Convert
        rows_written = _convert_excel_to_csv(tmp_excel, tmp_csv)

        # Step 3 — Validate
        valid, reason = _validate(tmp_csv, prev_state)
        if not valid:
            logger.error("GPR sync: validation failed — %s", reason)
            _save_state({**prev_state, "last_error": reason})
            return get_sync_status()

        # Step 4 — Atomic replace
        CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(tmp_excel, EXCEL_CACHE)   # keep raw Excel for auditing
        os.replace(tmp_csv, CSV_OUT)           # atomic on POSIX + Windows

        # Step 5 — Persist state
        import csv
        with open(CSV_OUT, newline="") as f:
            last_row = list(csv.DictReader(f))[-1]
        date_col  = next(
            (k for k in last_row if k.lower() in ("date", "day")), None
        )
        last_date = last_row.get(date_col, "") if date_col else ""

        new_state = {
            "last_synced":  datetime.now(timezone.utc).isoformat(),
            "rows_written": rows_written,
            "last_date":    last_date,
            "last_error":   None,
        }
        _save_state(new_state)
        logger.info(
            "GPR sync: success — %d rows, last date %s",
            rows_written, last_date
        )

    finally:
        tmp_excel.unlink(missing_ok=True)
        tmp_csv.unlink(missing_ok=True)

    return get_sync_status()
