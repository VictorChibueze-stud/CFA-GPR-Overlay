/**
 * API Client for GPR Intelligence Backend.
 * 
 * This module centralizes all API communication. It's the only place that knows
 * the API_BASE_URL. All hooks and components import from here.
 * 
 * Data flow analysis:
 * 
 * HOOK: useGPRData
 * CURRENT: Fetches /data/gpr_daily.csv via parseGPR.ts → returns GPRDataPoint[]
 * API:     GET /api/gpr/series?preset=X → returns { data: [{ date, gprd, gprd_ma7, gprd_ma30 }], spike_dates, total_rows }
 * DELTA:   API response.data needs to be mapped to GPRDataPoint shape; add gprd_act, gprd_threat from CSV layer
 *
 * HOOK: useIndustryImpact
 * CURRENT: Static imports of impact.json + advisory.json → returns { industries[], summary }
 * API:     GET /api/impact → returns { event, impact, report }
 * DELTA:   impact.model_dump() has industries[]; report.model_dump() has summary fields
 *
 * HOOK: useHoldings
 * CURRENT: Fetches /data/portfolio_default.csv + static holdings_shortlist.json
 * API:     POST /api/impact/upload → same response as /api/impact
 * DELTA:   Upload triggers pipeline, returns { event, impact, report }
 *
 * HOOK: useAgentIntelligence
 * CURRENT: Static imports of level1_clusters.json, level2_analysis.json, level3_deepdive.json
 * API:     No corresponding endpoint (agent intelligence is static-only for now)
 * DELTA:   Keep static-only
 *
 * COMPONENT: DashboardShell
 * CURRENT: Hardcoded "LAST UPDATE · 08:42 UTC"
 * API:     GET /api/gpr/sync-status → returns { last_date, ... }
 * DELTA:   Fetch sync status, display last_date instead of hardcoded value
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ──────────────────────────────────────────────────────────────────────────
// GPR Series Data
// ──────────────────────────────────────────────────────────────────────────

export interface GprSeriesResponse {
  data: Array<{
    date: string
    gprd: number
    gprd_ma7: number
    gprd_ma30: number
  }>
  spike_dates: string[]
  preset: string
  total_rows: number
}

export async function fetchGPRSeries(preset = '5Y'): Promise<GprSeriesResponse> {
  const res = await fetch(`${API_BASE}/api/gpr/series?preset=${preset}`)
  if (!res.ok) throw new Error(`GPR series fetch failed: ${res.status}`)
  return res.json()
}

// ──────────────────────────────────────────────────────────────────────────
// GPR Latest + Active Event
// ──────────────────────────────────────────────────────────────────────────

export interface GprLatestResponse {
  date: string
  gprd: number
  percentile: number
  is_spike: boolean
  status: 'EXTREME_SPIKE' | 'ELEVATED' | 'NORMAL'
  active_event: Record<string, any> | null
}

export async function fetchGPRLatest(): Promise<GprLatestResponse> {
  const res = await fetch(`${API_BASE}/api/gpr/latest`)
  if (!res.ok) throw new Error(`GPR latest fetch failed: ${res.status}`)
  return res.json()
}

// ──────────────────────────────────────────────────────────────────────────
// Impact Analysis Pipeline
// ──────────────────────────────────────────────────────────────────────────

export interface ImpactResponse {
  event: Record<string, any>
  impact: Record<string, any>
  report: Record<string, any>
}

export async function fetchImpact(): Promise<ImpactResponse> {
  const res = await fetch(`${API_BASE}/api/impact`)
  if (!res.ok) throw new Error(`Impact fetch failed: ${res.status}`)
  return res.json()
}

export async function uploadPortfolio(file: File): Promise<ImpactResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/impact/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `Upload failed: ${res.status}`)
  }
  return res.json()
}

// ──────────────────────────────────────────────────────────────────────────
// Sync Status
// ──────────────────────────────────────────────────────────────────────────

export interface SyncStatusResponse {
  last_synced: string | null
  rows_written: number | null
  last_date: string | null
  last_error: string | null
  csv_exists: boolean
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const res = await fetch(`${API_BASE}/api/gpr/sync-status`)
  if (!res.ok) throw new Error(`Sync status fetch failed: ${res.status}`)
  return res.json()
}
