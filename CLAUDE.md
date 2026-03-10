# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (Python 3.10+)
pip install -r requirements.txt

# Run the full analysis pipeline
python demo.py
python demo.py --gpr-file data/gpr_daily_sample.csv --portfolio-file data/LCTD_portfolio_2025-12-31.csv --event-date 2025-06-23 --output-dir out

# Advanced CLI with manual event override and criteria matching
python src/gpr_overlay/cli/demo_generate_report.py \
  --manual-event-peak-date 2025-06-23 \
  --manual-event-start-date 2025-06-16 \
  --manual-event-end-date 2025-06-25 \
  --holdings-mode vulnerable

# Run all tests
pytest tests/ -v

# Run a single test file
pytest tests/test_gpr_event_detection.py -v

# Run a single test by name
pytest tests/test_advisory_service.py -v -k "test_name"

# Dashboard (separate Node project)
cd dashboard && npm install && npm run dev
```

The `src/` directory is not installed as a package — `demo.py` adds it to `sys.path` at runtime, and `tests/conftest.py` does the same for pytest.

## Architecture

### Pipeline flow

```
GPR CSV → GprDailyPoints → GprEvents → PortfolioSnapshot
                                            ↓
                                    IndustryExposures
                                            ↓
                              EventImpactProfile → AdvisoryReport → JSON outputs
```

All data models are Pydantic v2 `BaseModel` subclasses in `src/gpr_overlay/data_models/`. All core logic is in `src/gpr_overlay/services/`. `demo.py` is the public CLI entrypoint that wires the services together.

### Key data models (`data_models/`)

- `GprDailyPoint` — one row of the GPR time series (date, gprd, optional moving averages)
- `GprEvent` / `GprEventType` — a detected risk event with `start_date`, `peak_date`, `end_date`, `severity_score` [0,1], `percentile` [0,1]
- `PortfolioHolding` / `PortfolioSnapshot` — fund holdings with `weight_pct`, `fed_industry_id`, `gpr_beta`, optional `region_guess`/`country_guess`
- `IndustryExposure` — aggregated per-industry weight and weight-averaged `gpr_beta`
- `EventIndustryImpact` / `EventImpactProfile` — impact scores per industry and summary metrics
- `AdvisoryReport` — structured report with `summary`, `key_points`, top vulnerable/resilient industries

### Services (`services/`)

| Service | Key functions |
|---|---|
| `gpr_ingestion_service` | `load_gpr_daily_from_csv(path)` |
| `gpr_event_detection_service` | `detect_gpr_events(points, include_regimes=False)`, `select_event_for_target_date(events, date)` |
| `portfolio_overlay_service` | `load_portfolio_snapshot_from_csv(path)`, `compute_portfolio_industry_exposure(snapshot)`, `compute_portfolio_gpr_vulnerability(exposures)` |
| `industry_impact_service` | `compute_event_portfolio_impact(event, exposures)` |
| `advisory_service` | `build_advisory_report(snapshot, impact_profile)` |

### Event detection

Default mode (`include_regimes=False`) emits only spikes:
- **Quantile spikes**: per-day, full-history percentile ≥ 0.99 → `elevated_spike`; ≥ 0.995 → `extreme_spike`. Event window: `[peak - 7d, peak + 2d]`.
- **Short-term spikes**: z-score > 2.0 on 30-day rolling window + local maximum check. Same window convention.

Pass `include_regimes=True` to also detect `EPISODE` (≥ 10 consecutive days above 80th percentile of MA7) and `REGIME` (≥ 60 days above 75th percentile of MA30).

### Impact formula

```
impact_score = severity_score * (portfolio_weight / 100.0) * gpr_beta
net_impact > 0  →  net resilient
net_impact < 0  →  net vulnerable
```

`portfolio_vulnerability_baseline` = portfolio GPR beta exposure at severity=1.0 (not a pre-event observation).

### Advisory ESG constraint

`advisory_service.py` maintains a hardcoded `ESG_BANNED_INDUSTRY_IDS` set (`coal`, `petroleum_and_natural_gas`, `oil_and_gas`, `defense`, `weapons`) that prevents upward tilt recommendations into those sectors.

### Portfolio CSV format

Expected columns: `fund_name`, `as_of_date`, `security_name_report`, `weight_pct`, `fed_industry_id`, `fed_industry_name`, `gpr_beta`, `gpr_sentiment`, `mapping_confidence`, `ticker_guess`, `isin_guess`, `sector_raw`, `market_value_raw`, `mapping_rationale_short`. Optional: `region_guess`, `country_guess`.

The loader tolerates markdown code fences and Swiss apostrophe number formatting (`2'847'611.40`). Total weight is expected in `[95, 105]` — a warning is logged if outside that range.

### Outputs (`out/`)

- `impact_<date>.json` — serialized `EventImpactProfile`
- `advisory_<date>.json` — serialized `AdvisoryReport`
- `holdings_shortlist.json` — top-5 holdings per vulnerable/resilient industry with vulnerability composition metrics

### Tests

`tests/` uses synthetic data fixtures (no external network calls). The `test_quant_sanity_*.py` files check mathematical invariants (severity monotonicity, impact sign consistency, portfolio weight normalization). Run these to catch regressions in numeric behavior. Other notable test files: `test_criteria_matches.py` (criteria JSON matching), `test_holdings_shortlist.py` (shortlist enrichment), `test_cfa_publication_event.py` (specific publication event regression).

### Data preparation (`src/gpr_overlay/cli/convert_gpr_excel_to_csv.py`)

Converts a raw Caldara & Iacoviello GPR Excel file (`.xls`/`.xlsx`) to the CSV format expected by `load_gpr_daily_from_csv`. Computes `GPRD_MA30`/`GPRD_MA7` rolling averages if absent.

```bash
python src/gpr_overlay/cli/convert_gpr_excel_to_csv.py \
  data/raw/data_gpr_daily_recent.xls \
  data/gpr_daily_sample.csv
```

### Advanced CLI (`src/gpr_overlay/cli/demo_generate_report.py`)

More feature-complete alternative to `demo.py` with:
- `--manual-event-peak/start/end-date` — inject a synthetic event instead of auto-detecting one
- `--holdings-mode {vulnerable|resilient|all}` — filter the holdings shortlist
- `--criteria-json` — pass a JSON list of `{cluster_id, region, industry}` objects for deterministic criteria matching; matched holdings appear in a separate `criteria_matches` key in the output

### Dashboard (`dashboard/`)

Standalone Next.js 14 + TypeScript + Tailwind CSS v4 app. Not integrated with the Python backend at runtime — it reads CSV/JSON files directly. Four screens: Event Monitor (full GPR 1985–present), Industry Impact, Holdings Table, Agent Intelligence. Uses Recharts for charting and shadcn/ui + Radix UI for components. Data hooks are designed for one-line migration to a FastAPI backend.
