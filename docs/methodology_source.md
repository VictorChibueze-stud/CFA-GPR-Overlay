# GPR Early-Warning & ESG Overlay – System Specification

**Project:** blkb-gpr-esg-overlay  
**Client:** BLKB (Basellandschaftliche Kantonalbank)  
**Provider:** MachinaLabs  
**Last updated:** 2025-12-07

## 1. Purpose and context

This project implements a Geopolitical Risk (GPR) Early-Warning & ESG Overlay
proof-of-concept for BLKB’s iQ Responsible Equity Switzerland fund.

The core idea:

- Use the Caldara & Iacoviello Global Geopolitical Risk (GPR) index to detect
  periods of elevated geopolitical risk (spikes, episodes, regimes).
- Use the Fed “GPR Stock Price Sensitivity by Industry” table to map industries
  to GPR exposure (betas and sentiment).
- Combine this with the BLKB ESG fund holdings to measure where the fund is
  structurally vulnerable or resilient to GPR shocks.
- Provide advisory-style suggestions (not automated trading) that respect BLKB’s
  ESG constraints.

This codebase focuses on the data and risk mechanics. A separate Langflow
workflow consumes events and exposures to:
- fetch and summarise news explaining the spike, and
- generate ESG-compliant tactical suggestions.

## 2. Data inputs

- **GPR daily data**
  - File: `data/raw/gpr_daily_original/gpr_daily_recent.csv`
  - Columns:
    `N10D, GPRD, GPRD_ACT, GPRD_THREAT, date, GPRD_MA30, GPRD_MA7, event`.

- **BLKB ESG fund holdings + Fed mapping**
  - File: `data/fund/blkb_iq_responsible_equity_ch_2025-09-30.csv`
  - Each row: one holding of the BLKB iQ Responsible Equity Switzerland fund
    with fund fields and mapped Fed industry exposure.

- **Fed industry reference tables** (placeholders for now)
  - `data/reference/fed_gpr_industry_betas.csv`
  - `data/reference/fed_gpr_industry_sentiment.csv`
  - `data/reference/fund_to_fed_industry_mapping.csv`

## 3. High-level pipeline

1. **GPR ingestion and event detection**
   - Ingest cleaned GPR daily CSV into `GprDailyPoint` objects.
   - Detect:
     - short-term spikes (relative to recent 30-day history),
     - episodes (medium-length stretches of elevated GPR),
     - regimes (longer periods of structurally high GPR).

2. **Portfolio overlay (later phases)**
   - Load BLKB fund snapshot into `PortfolioSnapshot`.
   - Aggregate holdings by Fed industry into `IndustryExposure`.
   - Combine portfolio weights with Fed GPR betas to compute GPR vulnerability.

3. **Event impact and advisory (later phases)**
   - For a given event and portfolio exposure profile, identify:
     - most vulnerable industries,
     - more resilient industries.
   - Provide ESG-aware advisory text as part of a separate Langflow workflow.

## 4. Implementation status (by phase)

- **Phase 0 – Scaffold & datasets (done)**
  - Project structure under `src/gpr_overlay/`.
  - Datasets: `gpr_daily_recent.csv`, BLKB fund mapping CSV.

- **Phase 1 – Data loading layer (done)**
  - Models:
    - `GprDailyPoint` (GPR daily data),
    - `PortfolioHolding`, `PortfolioSnapshot`,
    - `IndustryExposure`.
  - Services:
    - `load_gpr_daily_from_csv`,
    - `load_portfolio_snapshot_from_csv`.
  - Tests:
    - `test_gpr_ingestion.py`,
    - `test_portfolio_loading.py`.

- **Phase 2 – GPR event detection (done)**
  - Models:
    - `GprEventType`,
    - `GprEvent`.
  - Service:
    - `detect_gpr_events`, plus internal helpers:
      `_points_to_dataframe`, `_detect_short_term_spikes`,
      `_detect_episodes`, `_detect_regimes`.
  - Behaviour:
    - Simple, explainable heuristics using rolling means, standard deviations,
      and percentiles to flag spikes, episodes, and regimes.
  - Tests:
    - `test_gpr_event_detection.py` with synthetic data.

### GPR Event Detection (updated)

- Production detection now emits per-day quantile spikes using the full-history GPR distribution. Two spike tiers are used:
  - `elevated_spike` (percentile >= 0.99)
  - `extreme_spike` (percentile >= 0.995)
- Percentiles are represented as fractions in the range 0.0–1.0 in JSON outputs.
- The production trigger is per spike day: for a spike on date `t` the analysis window is `start_date = t - N_pre`, `end_date = t + N_post` where `N_pre` and `N_post` are configurable (defaults: 7 and 2).

### Demo & manual overrides

- The CLI demo supports a manual event injection using three flags: `--manual-event-peak`, `--manual-start-date`, `--manual-end-date`. When provided the demo uses the given dates and computes the peak's percentile against the loaded GPR history to assign `elevated_spike` / `extreme_spike` and includes the constructed event in both the advisory and holdings JSON outputs.

### Advisory outputs & responsibilities

- The Python service no longer emits `recommended_actions` in the `AdvisoryReport` JSON. Detection and numeric analytics remain in Python; Langflow or a downstream NLP layer is responsible for narrative recommended actions.

### Vulnerability composition in outputs

- Advisory reports and holdings vulnerable JSON now include computed vulnerability composition metrics and per-industry/per-holding weight shares: `vulnerable_weight_share`, `non_vulnerable_weight_share`, `vulnerable_industry_count`, `total_industry_count`, `vulnerable_industry_share`, `non_vulnerable_industry_share`, per-industry `industry_portfolio_weight`, `industry_weight_share_of_portfolio`, `industry_weight_share_of_vulnerable`, and per-holding `industry_weight_share_for_holding`.

 **Phase 3 – Portfolio overlay (done)**
  - Aggregates portfolio holdings by Fed GPR industry into `IndustryExposure`.
  - Computes a portfolio-level GPR vulnerability score as:
    sum_over_industries(weight_fraction * beta),
    where weight_fraction = portfolio_weight / 100.
  - Tests:
    - `test_portfolio_overlay.py` with synthetic portfolios.

 **Phase 4 – Event → portfolio impact bridge (done)**
  - Given a `GprEvent` and a list of `IndustryExposure` for a portfolio, computes
    an `EventImpactProfile`:
    - per-industry impact scores,
    - lists of vulnerable and resilient industries,
    - total negative/positive and net impact.
  - Uses a simple, explainable formula:
    `impact_score = severity_score * (portfolio_weight / 100) * gpr_beta`.

- **Phase 5 – Advisory & CLI demo (done)**
  - Generate structured advisory reports and a CLI demo tying together events,
    portfolio impact, and ESG constraints.
  - CLI demo: `cli/demo_generate_report.py` produces a JSON `AdvisoryReport`.
    
    - Advisory behaviour notes:
      - **Net impact sign:** `net_impact > 0` = portfolio is *net resilient*; `net_impact < 0` = portfolio is *net vulnerable*.
      - **Hedge suggestions:** Hedge recommendations are only suggested when the portfolio is net vulnerable and the event severity is material (e.g. severity &gt; 0.3).
      - **Action priorities:** Action priorities scale with `severity_score` (low &lt;0.3, medium 0.3–0.7, high &gt;=0.7).
      - **Baseline meaning:** `portfolio_vulnerability_baseline` represents the portfolio-level impact under a severity=1.0 shock (i.e. the portfolio's GPR beta exposure), not an observed pre-event level.

      ### CLI holdings shortlists & criteria matching

      - The CLI demo `cli/demo_generate_report.py` supports new flags:
        - `--portfolio-file <path>`: path to portfolio CSV (optional; defaults to demo fund file).
        - `--output-report <path>`: write the `AdvisoryReport` JSON to this path; if omitted the report is printed to stdout.
        - `--output-holdings <path>`: write holdings shortlist + criteria_matches JSON to this path (separate from the advisory report).
        - `--holdings-mode <vulnerable|resilient|all>`: which industries to include in shortlists. `vulnerable` uses `impact_profile.vulnerable_industries`, `resilient` uses `impact_profile.resilient_industries`, `all` uses the union.
        - `--per-industry <int>`: top N holdings per industry to include (default `5`).
        - `--criteria-json <path>`: optional path to JSON containing either a top-level list of criteria objects or a Flow1 raw format (see below).

      Shortlists JSON schema (written to `--output-holdings`):

      - `meta`: object with `fund_name`, `as_of_date`, `event_id`, `event_type`, `event_peak_date`.
      - `mode`: one of `"vulnerable"|"resilient"|"all"`.
      - `per_industry`: integer top-N used.
      - `shortlists_by_industry`: mapping from `"<FedIndustryName>"` to array of holdings. Each holding object contains only: `security_name_report`, `weight_pct`, `fed_industry_name`, `region_guess`, `country_guess`.
      - `criteria_matches`: array of criteria match records (empty list if no criteria provided).

      Shortlist rules:
      - Group holdings by `fed_industry_name`.
      - Within each industry sort holdings by `weight_pct` descending (ignore None weights for ranking by treating them as zero).
      - Select top N per industry where N=`--per-industry`.
      - Include only `security_name_report`, `weight_pct`, `fed_industry_name`, `region_guess`, `country_guess` in the holdings JSON; do not include `ticker_guess` or `isin_guess`.
      - Mode selection filters industries based on `impact_profile.vulnerable_industries` and `impact_profile.resilient_industries` provided by `compute_event_portfolio_impact`.

      Criteria matching rules:
      - If `--criteria-json` is provided, the CLI accepts either:
        - A top-level list of criteria objects: `{ "cluster_id": "...", "region_guess": "..." | "region": "...", "industry_name": "..." }`, or
        - A Flow1 raw export object containing `channels_by_cluster[]`, where each cluster contains `cluster_id`, `region`, and `economic_channels[]` with `linked_industries[]` objects that include `industry_name`.
      - For each criteria item we match holdings deterministically using only Python string equality (no normalization beyond trimming):
        - `holding.region_guess` equals `criteria.region_guess` (case-insensitive exact match after `.strip()`), AND
        - `holding.fed_industry_name` equals `criteria.industry_name` (case-insensitive exact match after `.strip()`).
      - Output per matched criteria item:
        ```json
        {
          "cluster_id": "...",
          "region_guess": "<as provided>",
          "industry_name": "...",
          "matched_holdings": [ {security_name_report, weight_pct, fed_industry_name, region_guess, country_guess} ]
        }
        ```
      - Note: region normalization happens in Langflow, not Python.

      Flow notes:
      - Flow 1: threat clusters + regions + linked industries + evidence (done).
      - Flow 2: stock-level exposure analysis using holdings shortlist + FMP symbol resolver (next).

## 5. Future evolution

- Add ESG rules and constraints explicitly as configuration.
- Integrate Langflow flows for:
  - news retrieval and spike explanation,
  - generation of ESG-compliant tactical suggestions.
- Harden event detection thresholds based on backtesting and user feedback.

## Robustness & Hardening (recent pass)

- **Severity standardisation:** All event `severity_score` values are represented on a common [0,1] scale. Short-term spikes use a z-based scaling (z/5.0 clamped to [0,1]). Episodes and regimes are normalised from their raw heuristics into a 0–10 score and then divided by 10 and clamped to [0,1].
- **Missing severity handling:** If an event's `severity_score` is missing, downstream impact computations treat it as a worst-case `1.0` and advisory output notes the fallback for transparency.
- **Divide-by-zero guards:** When computing industry-weighted betas, industries with effectively zero total fractional weight are skipped and a warning is emitted to avoid dividing by near-zero values.
- **Floating-point noise (EPS):** Small epsilons are used for sign checks to avoid mis-classifying tiny values as positive/negative due to floating-point noise.
- **CLI & serialization:** Pydantic v2 serialization uses `model_dump_json(indent=2)` in the CLI demo to avoid deprecated `.json(...)` usage.
- **Tests added:** Boundary tests for short-history spike detection, episode-length boundaries, and zero-total-weight industry handling were added to help prevent regressions.

## Quant Sanity & Diagnostic Tests

- Added a set of fast, deterministic "quant sanity" tests that probe the numerical
  behaviour of the core pipeline (event detection, portfolio vulnerability, impact mapping).
- Tests check:
  - monotonicity of spike severity with raw spike magnitude (all else equal),
  - severity normalization to the [0,1] range and percentile ranges (0–100),
  - sign/ordering consistency of impact scores with industry betas,
  - portfolio invariants under uniform weight renormalization, and
  - advisory-level constraints (no suggestions to increase exposure into excluded negative-beta sectors).

- Test files: `tests/test_quant_sanity_events.py`, `tests/test_quant_sanity_portfolio.py`, `tests/test_quant_sanity_impact.py`

These tests are intentionally lightweight and stress the mathematical invariants
and signal quality rather than implementation details; they are useful diagnostics
for model tuning and stability checks.

## Historical Event Selection CLI

- The CLI demo now supports an optional `--event-date YYYY-MM-DD` argument allowing
  generation of an `AdvisoryReport` for a specific historical date (e.g. `2022-03-10`).
- Internally the demo uses `select_event_for_target_date(events, target_date)` to choose
  an event that either contains the date (prefer highest severity) or is closest by peak date.
  This enables repro-friendly, date-targeted audits of the overlay pipeline.

## Planned Extensions

The following enhancements are planned for future phases. These are design notes
only and have not been implemented yet.

- **Threats sub-index (GPT / GPRD_THREAT):**
  - The Caldara & Iacoviello GPR dataset includes a threats sub-index (commonly
    exposed as `GPRD_THREAT` or similar). We plan a future phase to integrate
    this signal as an earlier-warning dimension alongside the main GPR series.
  - Planned work:
    - Expose the threats value in the `GprDailyPoint` model so it travels through
      the pipeline.
    - Extend event detection or add a second "threat-triggered" event channel
      that can flag elevated threat-readings which may precede full GPR spikes.
    - Experiment in advisory logic with threat-based early warnings and actions
      (for example, proactive monitoring or pre-emptive hedging suggestions).
  - Status: planned (no implementation yet).

- **Weekly GPR ingestion job (cron-style):**
  - We plan to automate a weekly refresh of the canonical GPR daily data so the
    overlay remains up to date without manual intervention.
  - Planned workflow:
    - Download the latest GPR XLS/XLSX from the official source (or licensed mirror) on a weekly cadence (e.g., Monday or next business day).
    - Convert the source to our canonical CSV format and perform basic sanity checks (column presence, date continuity).
    - Upsert new/updated rows into a `gpr_daily` store (e.g., MongoDB collection or versioned CSV in object storage), and log the last successful update.
    - Provide a small CLI entrypoint (e.g. `gpr_overlay.cli.update_gpr_data`) that can be scheduled via cron, Task Scheduler, or an orchestrator.
  - Status: planned (implementation to be scheduled in a later sprint).
