# CFA GPR Overlay

A Python tool that overlays Geopolitical Risk (GPR) spike events onto an equity portfolio to estimate industry-level exposure and generate a structured advisory report. Built as a research/publication demo for CFA work.

---

## What it does

1. **Ingests GPR data** — loads daily GPR index values from CSV
2. **Detects spike events** — identifies short-term geopolitical risk spikes using z-score and quantile-based methods (spike-only by default; regimes/episodes available on request)
3. **Loads a portfolio snapshot** — reads holdings with weights and industry classifications
4. **Computes industry exposure** — maps portfolio weights to affected industries
5. **Scores impact** — ranks industries as vulnerable or resilient relative to the selected event
6. **Generates outputs** — writes an impact profile, an advisory report, and a holdings shortlist (top 5 holdings per relevant industry) as JSON

---

## Project structure

```
cfa-gpr-overlay/
├── data/                        # Sample GPR series and portfolio CSVs
├── notebooks/                   # Jupyter notebooks for exploration and demos
│   ├── 01_gpr_spike_detection.ipynb
│   ├── 02_portfolio_impact_demo.ipynb
│   └── 03_agentic_narrative_overlay.ipynb
├── src/gpr_overlay/
│   ├── data_models/             # Pydantic models (GprEvent, Portfolio, AdvisoryReport, etc.)
│   └── services/                # Core logic (ingestion, detection, impact, advisory)
├── tests/                       # pytest test suite
├── scripts/                     # Utility scripts (ETF analysis, dataset building)
├── demo.py                      # CLI entrypoint
└── requirements.txt
```

---

## Quick start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the analysis pipeline with defaults
python demo.py

# Specify files and target date
python demo.py \
  --gpr-file data/gpr_daily_sample.csv \
  --portfolio-file data/LCTD_portfolio_2025-12-31.csv \
  --event-date 2025-06-23 \
  --output-dir out
```

Outputs are written to `out/`:
- `impact_<date>.json` — industry impact profile
- `advisory_<date>.json` — full advisory report
- `holdings_shortlist.json` — top holdings per vulnerable/resilient industry

---

## Running tests

```bash
pytest tests/ -v
```

---

## Dependencies

Python 3.10+, pandas, numpy, pydantic v2, matplotlib, typer, pytest, jupyter.

---

## Notes

- GPR data used here is a sample derived from publicly available research. See `docs/methodology_source.md` for source details.
- Event detection defaults to spike-only mode to keep outputs clean and actionable for publication. Regime detection can be enabled via `detect_gpr_events(points, include_regimes=True)`.
- This is a research/demo tool, not production-grade financial software.
