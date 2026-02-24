"""Portfolio overlay computations.

Functions to compute portfolio exposures to Fed industries and a simple
vulnerability metric. Implementations are minimal and mostly signatures
with explanatory docstrings.
"""
from __future__ import annotations

from typing import List, Any, Dict, Tuple
from gpr_overlay.data_models.portfolio_snapshot import PortfolioSnapshot
from gpr_overlay.data_models.industry_exposure import IndustryExposure
from pathlib import Path
import logging
import pandas as pd
from io import StringIO

logger = logging.getLogger(__name__)


def compute_portfolio_industry_exposure(snapshot: PortfolioSnapshot) -> List[IndustryExposure]:
    """Compute industry-level exposures from a portfolio snapshot.

    Behaviour:
    - Ignore holdings with missing `fed_industry_id` or missing `gpr_beta`.
    - Group holdings by `fed_industry_id` and aggregate `weight_pct` (percent)
      and compute a weight-fraction-weighted average of `gpr_beta`.
    - Compute simple average of non-null `gpr_sentiment` values for the industry.

    Returns a list of `IndustryExposure` objects (one per industry).
    """
    groups: Dict[str, List] = {}
    name_map: Dict[str, str] = {}

    for h in snapshot.holdings:
        if h.fed_industry_id is None:
            continue
        if h.gpr_beta is None:
            continue
        key = h.fed_industry_id
        groups.setdefault(key, []).append(h)
        if key not in name_map and h.fed_industry_name:
            name_map[key] = h.fed_industry_name

    exposures: List[IndustryExposure] = []

    for ind_id, holdings in groups.items():
        # Sum portfolio weight as percent
        portfolio_weight = float(sum(h.weight_pct for h in holdings))

        # Compute weight-fraction-weighted average of gpr_beta
        # w_i = weight_pct / 100
        weighted_num = 0.0
        weighted_den = 0.0
        sentiments = []
        for h in holdings:
            w_frac = float(h.weight_pct) / 100.0
            weighted_num += w_frac * float(h.gpr_beta)
            weighted_den += w_frac
            if h.gpr_sentiment is not None:
                sentiments.append(float(h.gpr_sentiment))

        if weighted_den <= 1e-8:
            # Defensive guard: if total fractional weight is effectively zero,
            # the weighted beta cannot be computed reliably. Skip the industry
            # and emit a warning for auditing.
            logger.warning(
                "Skipping industry %s because total weight fraction is zero or too small; cannot compute weighted beta",
                ind_id,
            )
            continue
        else:
            avg_beta = weighted_num / weighted_den

        avg_sentiment = float(sum(sentiments) / len(sentiments)) if sentiments else None

        exposures.append(
            IndustryExposure(
                fed_industry_id=ind_id,
                fed_industry_name=name_map.get(ind_id, ind_id),
                portfolio_weight=portfolio_weight,
                gpr_beta=avg_beta,
                gpr_sentiment=avg_sentiment,
            )
        )

    return exposures


def compute_portfolio_gpr_vulnerability(exposures: List[IndustryExposure]) -> float:
    """Compute a scalar vulnerability score for a portfolio from exposures.

    A simple formula (example): sum(portfolio_weight * gpr_beta).
    This function returns that metric; future improvements may incorporate
    sentiment and convexity adjustments.
    """

    total = 0.0
    for e in exposures:
        try:
            w_frac = float(e.portfolio_weight) / 100.0
        except Exception:
            w_frac = 0.0
        if w_frac == 0.0 or e.gpr_beta is None:
            e.contribution_to_vulnerability = 0.0
            continue
        contrib = w_frac * float(e.gpr_beta)
        e.contribution_to_vulnerability = contrib
        total += contrib
    return float(total)


def load_portfolio_snapshot_from_csv(
    csv_path: Path | str,
    fund_name_filter: str | None = None,
    as_of_date_filter: str | None = None,
) -> PortfolioSnapshot:
    """Load a BLKB fund CSV (with Fed GPR mapping) into a PortfolioSnapshot.

    This loader is tolerant to Markdown/code fences (```csv ... ```) that
    may wrap the CSV in the file. It strips such fence lines before parsing.

    Uses `csv.DictReader` for robust parsing when rows have irregular field counts,
    and performs safe numeric conversions for `weight_pct` and `mapping_confidence`.
    """
    import csv

    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Portfolio CSV file not found: {path}")

    # Read file text and remove markdown/code fence lines
    text = path.read_text(encoding="utf-8")
    cleaned_lines = [ln for ln in text.splitlines() if not ln.strip().startswith("```")]
    cleaned_text = "\n".join(cleaned_lines)

    # Parse with csv.DictReader which maps header -> values; extra fields are ignored.
    reader = csv.DictReader(StringIO(cleaned_text))
    rows = list(reader)

    if not rows:
        raise ValueError(f"No rows found in {path} after parsing")

    # Optionally filter rows by fund_name / as_of_date early
    if fund_name_filter is not None:
        rows = [r for r in rows if r.get("fund_name") == fund_name_filter]

    if as_of_date_filter is not None:
        rows = [r for r in rows if r.get("as_of_date") == as_of_date_filter]

    if not rows:
        raise ValueError(
            f"No rows found in {path} for fund_name={fund_name_filter!r} "
            f"and as_of_date={as_of_date_filter!r}"
        )

    # Infer fund_name and as_of_date from parsed rows (expect exactly one unique each)
    fund_name_values = sorted({r.get("fund_name") for r in rows if r.get("fund_name") is not None})
    if len(fund_name_values) != 1:
        raise ValueError(f"Expected exactly one fund_name, got: {fund_name_values!r}")
    fund_name = fund_name_values[0]

    as_of_date_values = sorted({r.get("as_of_date") for r in rows if r.get("as_of_date") is not None})
    if len(as_of_date_values) != 1:
        raise ValueError(f"Expected exactly one as_of_date, got: {as_of_date_values!r}")
    as_of_date = pd.to_datetime(as_of_date_values[0]).date()

    holdings: List = []
    from gpr_overlay.data_models.portfolio_snapshot import PortfolioHolding

    def safe_float(val: str | None) -> float | None:
        if val is None:
            return None
        s = str(val).strip()
        if s == "" or s.lower() in {"unknown", "na", "n/a", "-"}:
            return None
        # Remove thousands apostrophes commonly used in Swiss formatting (e.g. 2'847'611.40)
        s = s.replace("'", "")
        try:
            return float(s)
        except Exception:
            return None

    for r in rows:
        weight = safe_float(r.get("weight_pct"))
        if weight is None:
            # If weight missing/unparseable, treat as 0.0 (and log a warning)
            logger.warning("Unparseable weight_pct for row: %s", r.get("security_name_report"))
            weight = 0.0

        mapping_conf = safe_float(r.get("mapping_confidence"))

        holding = PortfolioHolding(
            security_name_report=r.get("security_name_report") or "",
            ticker_guess=r.get("ticker_guess") or None,
            isin_guess=r.get("isin_guess") or None,
            sector_raw=r.get("sector_raw") or None,
            weight_pct=float(weight),
            market_value_raw=r.get("market_value_raw") or None,
            fed_industry_name=r.get("fed_industry_name") or None,
            fed_industry_id=r.get("fed_industry_id") or None,
            gpr_beta=safe_float(r.get("gpr_beta")),
            gpr_sentiment=safe_float(r.get("gpr_sentiment")),
            mapping_confidence=float(mapping_conf) if mapping_conf is not None else None,
            mapping_rationale_short=r.get("mapping_rationale_short") or None,
        )
        # Backwards-compatible optional fields that newer CSVs may include
        # (region_guess / country_guess) are accepted if present.
        # Use setattr to avoid changing constructor signature in older code.
        if r.get("region_guess") is not None:
            holding.region_guess = r.get("region_guess") or None
        if r.get("country_guess") is not None:
            holding.country_guess = r.get("country_guess") or None
        holdings.append(holding)

    total_weight = sum(h.weight_pct for h in holdings)
    if not (95.0 <= total_weight <= 105.0):
        logger.warning(
            "Total portfolio weight is %.2f, which is outside [95, 105]. Check the input CSV for missing or extra rows.",
            total_weight,
        )

    snapshot = PortfolioSnapshot(
        fund_name=fund_name,
        as_of_date=as_of_date,
        holdings=holdings,
    )

    logger.info(
        "Loaded portfolio snapshot for %s (%s) with %d holdings (total weight %.2f%%)",
        fund_name,
        as_of_date.isoformat(),
        len(holdings),
        total_weight,
    )
    return snapshot