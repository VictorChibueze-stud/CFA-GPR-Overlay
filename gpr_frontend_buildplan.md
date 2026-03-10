# GPR Intelligence Dashboard — Build Plan
**Project:** CFA-GPR-Overlay / dashboard  
**Author:** Victor Okoroafor  
**Purpose:** Portfolio piece + interview demo for ekona AG  
**Stack:** Next.js 14 · TypeScript · Tailwind · Recharts · FastAPI stub · Docker · GitHub Actions · Vercel

---

## Locked Decisions

| Decision | Choice |
|---|---|
| Working directory | `cfa-gpr-overlay/dashboard/` (subfolder inside existing repo) |
| GPR data source | `data/data_gpr_daily_recent.csv` only — one file, one parser |
| Old GPR file | `gpr_daily_sample.csv` — not used in frontend, kept for pipeline reference |
| Portfolio default | `data/LCTD_portfolio_2025-12-31.csv` (iShares LCTD fund) |
| Fund split | iShares → Screens 1–3 (quant). BLKB → Screen 4 (agent narratives). Both labelled in UI |
| Pipeline re-run | Not possible (Langflow files lost). Use existing output files |
| Deployment | Vercel (connected to GitHub repo) |
| Test strategy | Each phase ends with tests before moving to next phase |

---

## Data Source Map

| File | Screen | Notes |
|---|---|---|
| `data/data_gpr_daily_recent.csv` | Screen 1 | M/D/YYYY dates, metadata rows to skip, extra columns to drop |
| `out/impact_2025-06-23.json` | Screen 2 | iShares fund, clean |
| `out/advisory_2025-06-23.json` | Screen 1 + 2 | iShares fund, event metadata |
| `out/holdings_shortlist.json` | Screen 3 | iShares fund, top-5 per industry |
| `data/LCTD_portfolio_2025-12-31.csv` | Screen 3 | iShares, default upload template |
| `out/agentic_outputs/level1_threat_clusters.json` | Screen 4 Panel A | Cluster + channel taxonomy |
| `out/agentic_outputs/level2_portfolio_analysis.json` | Screen 4 Panel B | BLKB fund, watchlist |
| `out/agentic_outputs/level3_stock_deepdive.json` | Screen 4 Panel C | BLKB fund, deep dive verdicts |

---

## GPR CSV Parser Spec (`parseGPR.ts`)

**Input:** `data_gpr_daily_recent.csv`  
**Issues to handle:**
- Skip rows where `date` column value equals any column label string (metadata rows at top of file)
- Parse date from `M/D/YYYY` → ISO `YYYY-MM-DD` using `date-fns/parse`
- Drop columns: `DAY`, `var_name`, `var_label`
- Keep: `GPRD`, `GPRD_ACT`, `GPRD_THREAT`, `GPRD_MA30`, `GPRD_MA7`, `event`
- Parse all numeric columns as `parseFloat()`, default `0` on `NaN`
- After parsing all rows: compute percentile rank per row = `count(GPRD ≤ this) / total rows`
- Set `is_spike = true` if `percentile >= 0.99`
- Return `GPRDataPoint[]`

---

## Stack — Mapped to ekona AG Job Requirements

| Job Requirement | Implementation | Location |
|---|---|---|
| TypeScript, React, Next.js | Next.js 14 App Router, strict TypeScript | `dashboard/` |
| FastAPI | REST endpoint stub matching every hook | `api-stub/main.py` |
| Software architecture | Hook-based data layer, clean separation | `src/hooks/`, `src/types/` |
| Docker / Docker Compose | Multi-stage Dockerfile + compose file | `dashboard/Dockerfile`, `docker-compose.yml` |
| CI/CD (GitHub Actions) | Lint → typecheck → build → Vercel deploy | `.github/workflows/ci.yml` |
| PostgreSQL / Prisma | Schema with GprEvent, Portfolio, Holding tables | `prisma/schema.prisma` |
| REST API design | FastAPI endpoints documented and typed | `api-stub/` |
| AI/ML / LangChain | Existing Python pipeline (the ML layer) | `src/gpr_overlay/` |
| Frontend testing | Jest + React Testing Library | `src/hooks/__tests__/` |
| Sentry | Error boundary in layout | `src/app/layout.tsx` |

---

## Screen Specifications

### Screen 1 — GPR Event Monitor
- Full GPR line chart (1985–present) with GPRD_MA7 and GPRD_MA30 toggleable overlays
- **Zoom:** scroll wheel on time axis
- **Brush:** range selector mini-chart below main chart, draggable handles
- **Time presets:** `1Y | 5Y | 10Y | 2020–now | All` buttons
- **Threshold lines:** dashed horizontal at 80th / 95th / 99th percentile
- **Spike annotations:** amber vertical lines, hover tooltip: Event ID · Date · Percentile · Severity
- **Regime overlays:** toggleable shaded bands for EPISODE and REGIME periods
- Event summary card (right): event ID, peak date, severity, percentile, net impact sparkline
- Hint icons `ⓘ` on: GPRD, Severity Score, Net Impact, percentile lines

### Screen 2 — Industry Impact Dashboard
- Horizontal bar chart: industries ranked by impact score, red (vulnerable) / green (resilient)
- Scatter plot: X = portfolio weight, Y = GPR beta, bubble size = abs(impact score), quadrant labels
- 4 stat cards with `ⓘ` tooltips: Net Event Impact · Vulnerable Exposure · Resilient Exposure · Vulnerability Baseline
- Export button: downloads table as CSV

### Screen 3 — Holdings Table
- **Portfolio upload zone:** drag-and-drop CSV, validation, template download link
- Active source banner: "Analysing: iShares LCTD | 47 holdings | Default"
- Sortable columns (click header), search box, industry filter, exposure filter
- Expandable rows: inline detail with beta, mapping rationale
- Exposure badges: `VULNERABLE` · `RESILIENT` · `NEUTRAL`
- Pagination: 25 rows per page

### Screen 4 — Agent Intelligence
- **Panel A — Threat Clusters** (level1): accordion cards, region, primary actors, economic channels, linked industry tags
- **Panel B — Watchlist** (level2): holding cards with verdict badge, recommendation badge, news angle summary, confidence bar
- **Panel C — Deep Dive** (level3): two-column grid `LIKELY AFFECTED` / `MAYBE AFFECTED`, confidence bar, evidence footnotes
- Fund labels clearly marked: iShares (Panel A) · BLKB (Panels B & C)

### Global Features
- Persistent left sidebar (240px): logo, 4 nav links, active fund + event context
- Top bar: screen title, theme toggle, Export button, `?` Glossary button
- **Glossary panel** (slide-out): definitions of GPR, GPRD, MA7/30, spike/episode/regime, beta, impact score, vulnerability baseline, fed industry IDs
- **Methodology modal:** your full pipeline explained — spike detection, beta mapping, impact formula, 3-agent architecture, CFA publication credit
- **Guided tour** (driver.js): 5-step first-load overlay, dismissible, retriggerable from `?`
- Light / Dark theme toggle
- Print stylesheet (hides nav, expands rows, adds dashboard footer)
- Sentry error boundary
- Loading skeleton screens
- Error boundary components

---

## Data Hook Architecture

```
useGPRData()           → data/gpr_daily.csv via parseGPR.ts
useIndustryImpact()    → data/impact.json + data/advisory.json
useHoldings()          → data/holdings_shortlist.json + optional uploaded CSV
usePortfolioUpload()   → PapaParse client-side + column validation
useAgentIntelligence() → data/level1_clusters.json + level2_analysis.json + level3_deepdive.json
```

**FastAPI migration path:** In each hook, replace `import data from '../data/x.json'` with `fetch('/api/x')`. One line per hook. Zero component changes.

---

## npm Dependencies

### Production
```
recharts
@visx/brush
papaparse
react-dropzone
date-fns
clsx
tailwind-merge
@radix-ui/react-dialog
@radix-ui/react-accordion
@radix-ui/react-tooltip
@radix-ui/react-tabs
lucide-react
@sentry/nextjs
driver.js
```

### Dev
```
@types/papaparse
jest
@testing-library/react
@testing-library/jest-dom
jest-environment-jsdom
```

---

## Phase 0 — Environment Setup
**Goal:** All tools installed, authenticated, repo connected to Vercel. No code written.  
**Test:** Verification checklist — all 6 items pass.

### Steps
1. ✅ Node 22, npm 10, npx 10 verified
2. ✅ Git 2.53 verified
3. ✅ VS Code 1.109.5 verified
4. ✅ Vercel CLI installed (`npm install -g vercel`)
5. ✅ Vercel login complete
6. ✅ GitHub CLI installed (`winget install GitHub.cli`)
7. ✅ Git remote confirmed: `https://github.com/VictorChibueze-stud/CFA-GPR-Overlay.git`
8. ⬜ GitHub CLI authenticated (`gh auth login`)
9. ⬜ Repo pushed to GitHub (current state synced)
10. ⬜ Vercel project linked to GitHub repo (`vercel link` or via dashboard)
11. ⬜ npm updated to v11 (optional but recommended)

### Phase 0 Test Checklist
Run each command and confirm output:
```powershell
vercel --version          # must print a version number
gh auth status            # must say "Logged in to github.com"
git status                # must show clean or known changes
git log --oneline -3      # must show recent commits
```

---

## Phase 1 — Scaffold
**Goal:** Next.js app created, dependencies installed, data files copied, layout shell visible in browser.  
**Test:** `npm run build` exits with 0 errors. Sidebar with 4 nav links visible at localhost:3000.

### Steps
1. `npx create-next-app@latest dashboard` with TypeScript, Tailwind, App Router, src/ dir
2. Install all production + dev dependencies
3. Copy all data files to `dashboard/src/data/`
4. Configure Tailwind theme (colours + fonts)
5. Add Google Fonts (IBM Plex Mono + DM Sans) to layout
6. Create `src/types/index.ts` — all TypeScript interfaces
7. Scaffold 4 route pages as placeholders
8. Build persistent layout shell: sidebar + topbar
9. `npm run dev` — confirm zero errors

### Phase 1 Tests
- `npm run build` — zero TypeScript errors, zero lint errors
- Manual: open localhost:3000, confirm sidebar visible, all 4 nav links clickable
- Manual: confirm fonts loading (IBM Plex Mono on numbers, DM Sans on labels)

---

## Phase 2 — Data Layer
**Goal:** All 5 hooks built, typed, returning real data. CSV parser handles all edge cases.  
**Test:** Jest unit tests for parser + hooks.

### Steps
1. Build `src/lib/parseGPR.ts` — CSV parser with all edge case handling
2. Build `useGPRData.ts`
3. Build `useIndustryImpact.ts`
4. Build `useHoldings.ts` (with optional upload param)
5. Build `usePortfolioUpload.ts` (PapaParse + validation)
6. Build `useAgentIntelligence.ts`
7. Write Jest tests for each

### Phase 2 Tests (Jest)
```
parseGPR: parses M/D/YYYY correctly → outputs YYYY-MM-DD
parseGPR: skips metadata rows (rows where date = "date")
parseGPR: drops DAY, var_name, var_label columns
parseGPR: computes is_spike = true for rows at 99th percentile
useIndustryImpact: returns 12 industries, all with required fields
useHoldings: returns iShares data when no upload provided
usePortfolioUpload: returns error when required columns missing
usePortfolioUpload: returns Holding[] when valid CSV provided
```

---

## Phase 3 — Screen Components
**Goal:** All 4 screens render with real data. No hardcoded strings. No TypeScript errors.  
**Build order:** Screen 2 → Screen 3 → Screen 4 → Screen 1

### Phase 3 Tests
- Manual: each screen renders without console errors
- Manual: Screen 1 brush selector zooms chart correctly
- Manual: Screen 3 upload zone accepts CSV and updates table
- Manual: Screen 4 all three panels render with data
- `npm run build` — zero errors after each screen

---

## Phase 4 — Professional Layer
**Goal:** Glossary, methodology modal, guided tour, theme toggle, print stylesheet, Sentry, skeletons.

### Phase 4 Tests
- Manual: `?` button opens glossary panel
- Manual: `ⓘ` icons show correct tooltips
- Manual: guided tour triggers on first load, dismisses correctly
- Manual: theme toggle switches light/dark
- Manual: Ctrl+P shows clean print layout
- Manual: upload invalid CSV shows error boundary (not crash)

---

## Phase 5 — Architecture Showcase
**Goal:** FastAPI stub, Docker, Prisma schema, GitHub Actions CI visible in repo.

### Steps
1. Create `api-stub/main.py` — FastAPI with 4 GET endpoints matching hooks
2. Create `api-stub/requirements.txt`
3. Create `dashboard/Dockerfile` (multi-stage: node build + production)
4. Create `docker-compose.yml` at repo root (Next.js + FastAPI stub)
5. Create `prisma/schema.prisma` with GprEvent, Portfolio, Holding models
6. Create `.github/workflows/ci.yml` — lint → typecheck → build → Vercel deploy
7. Write professional `README.md`

### Phase 5 Tests
```powershell
docker build -t gpr-dashboard ./dashboard    # must succeed
cd api-stub && pip install -r requirements.txt && uvicorn main:app  # must start
gh workflow list    # must show ci.yml
```

---

## Phase 6 — Deploy
**Goal:** Live Vercel URL. Shareable in interview.

### Steps
```powershell
cd dashboard
vercel --prod
```

### Phase 6 Test
- Open the Vercel URL in a fresh incognito browser
- All 4 screens load
- GPR chart zooms and brushes correctly
- Portfolio upload works
- No console errors

---

## Visual Design Reference

| Token | Value | Usage |
|---|---|---|
| `surface` | `#0d1117` | Page background |
| `panel` | `#161b22` | Card / panel background |
| `border` | `#21262d` | All borders |
| `amber` | `#f59e0b` | Spikes, alerts, primary accent |
| `red` | `#ef4444` | Vulnerable industries |
| `green` | `#22c55e` | Resilient industries |
| `muted` | `#8b949e` | Secondary text |
| `text` | `#e6edf3` | Primary text |
| Font (numbers/tickers) | IBM Plex Mono | All numeric data |
| Font (labels/body) | DM Sans | Navigation, descriptions |

**Aesthetic:** Refined Bloomberg-meets-Palantir. Dense information, 1px borders, no drop shadows, no toy gradients. The kind of UI a CIO opens in a board meeting.

---

*Last updated: Phase 0 in progress*