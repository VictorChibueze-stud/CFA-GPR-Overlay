# GPR Intelligence Dashboard

An institutional-grade geopolitical risk overlay tool for portfolio
analysis. Built as the technical implementation underlying the
CFA Institute Enterprising Investor publication
"Geopolitical Risk and Portfolio Oversight".

## Features

- **Event Monitor** — Full Caldara & Iacoviello GPR index (1985–present)
  with spike detection, threshold lines, and interactive range selector
- **Industry Impact** — Portfolio exposure analysis across 12 Fed
  industry classifications with impact scoring
- **Holdings Table** — Sortable, filterable holdings with CSV upload
  and exposure badge classification
- **Agent Intelligence** — 3-agent AI pipeline output: threat clusters,
  priority watchlist, and deep dive verdicts

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS v4 · Recharts · Radix UI ·
shadcn/ui · Papaparse · date-fns · Jest · React Testing Library

## Data Sources

- GPR Index: Caldara & Iacoviello (2022), Federal Reserve Board
- Portfolio: iShares World ex U.S. Carbon Transition ETF (LCTD)
- Agent outputs: 3-agent LangChain pipeline (proprietary)

## Running Locally

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000

## Running Tests

```bash
npm test
```

## Architecture

Static JSON data layer with hook-based fetching architecture.
All data hooks are designed for one-line migration to a FastAPI
backend — replace the `fetch('/data/...')` calls with
`fetch('https://api.yourdomain.com/...')`.

## Author

Victor Okoroafor — AI/ML Engineer
MSc Data Science, University of Basel
