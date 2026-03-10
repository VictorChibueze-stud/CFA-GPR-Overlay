'use client'

import { useMemo } from 'react'
import level1 from '@/data/level1_clusters.json'
import level2 from '@/data/level2_analysis.json'
import level3 from '@/data/level3_deepdive.json'
import type {
  ThreatCluster,
  EconomicChannel,
  WatchlistHolding,
  DeepDiveHolding,
} from '@/types'

function toDeepDive(h: {
  company_name: string
  resolved_symbol: string
  weight_pct?: number
  fed_industry_name?: string
  exposure_verdict: string
  impact_direction: string
  confidence?: number
  rationale?: string
  linked_evidence_titles?: string[]
}): DeepDiveHolding {
  return {
    company_name: h.company_name,
    resolved_symbol: h.resolved_symbol,
    weight_pct: h.weight_pct ?? 0,
    fed_industry_name: h.fed_industry_name ?? '',
    exposure_verdict: h.exposure_verdict,
    impact_direction: h.impact_direction,
    confidence: h.confidence ?? 0,
    rationale: h.rationale ?? '',
    linked_evidence_titles: h.linked_evidence_titles ?? [],
  }
}

function deduplicateBySymbol<T extends { resolved_symbol: string }>(arr: T[]): T[] {
  return [...new Map(arr.map(h => [h.resolved_symbol, h])).values()]
}

export function useAgentIntelligence() {
  return useMemo(() => {
    try {
      // ---- Level 1: threat clusters ----
      type L1Channel = {
        channel_id: string
        channel_type: string
        description: string
        linked_industries: Array<{ industry_name: string; role: string; rationale: string }>
        evidence_found?: boolean
      }
      type L1Cluster = {
        cluster_id: string
        threat_category: string
        primary_actors: string[]
        region: string
        time_range: { start: string; end: string }
        economic_channels: L1Channel[]
      }

      const clusters: ThreatCluster[] = (
        (level1 as { channels_by_cluster: L1Cluster[] }).channels_by_cluster
      ).map(c => ({
        cluster_id: c.cluster_id,
        threat_category: c.threat_category,
        primary_actors: c.primary_actors ?? [],
        region: c.region,
        time_range: c.time_range
          ? `${c.time_range.start} – ${c.time_range.end}`
          : '',
        economic_channels: (c.economic_channels ?? []).map((ch): EconomicChannel => ({
          channel_id: ch.channel_id,
          channel_type: ch.channel_type,
          description: ch.description,
          evidence_found: ch.evidence_found ?? false,
          linked_industries: (ch.linked_industries ?? []).map(li => ({
            industry_name: li.industry_name,
            role: li.role,
            rationale: li.rationale,
          })),
        })),
      }))

      // ---- Level 2: watchlist ----
      type L2Holding = {
        company_name: string
        resolved_symbol: string
        weight_pct: number
        fed_industry_name?: string
        final_exposure_verdict: string
        recommendation_action: string
        summary?: string
        confidence?: number
      }

      const watchlist: WatchlistHolding[] = (
        (level2 as { portfolio_overview: { top_watchlist_holdings: L2Holding[] } })
          .portfolio_overview.top_watchlist_holdings ?? []
      ).map(h => ({
        company_name: h.company_name,
        resolved_symbol: h.resolved_symbol,
        weight_pct: h.weight_pct ?? 0,
        fed_industry_name: h.fed_industry_name ?? '',
        final_exposure_verdict: h.final_exposure_verdict,
        recommendation_action: h.recommendation_action,
        news_angle: h.summary ?? '',
        confidence: h.confidence ?? 0.75,
      }))

      // ---- Level 3: deep dive ----
      type L3Cluster = {
        likely_affected_holdings?: ReturnType<typeof toDeepDive>[]
        maybe_affected_holdings?: ReturnType<typeof toDeepDive>[]
      }

      const l3Clusters = (level3 as { clusters: L3Cluster[] }).clusters

      const rawLikely = l3Clusters.flatMap(c => c.likely_affected_holdings ?? [])
      const rawMaybe  = l3Clusters.flatMap(c => c.maybe_affected_holdings  ?? [])

      return {
        clusters,
        watchlist,
        deepdive: {
          likely: deduplicateBySymbol(rawLikely).map(toDeepDive),
          maybe:  deduplicateBySymbol(rawMaybe).map(toDeepDive),
        },
        loading: false,
        error: null,
      }
    } catch (err) {
      return {
        clusters: [] as ThreatCluster[],
        watchlist: [] as WatchlistHolding[],
        deepdive: { likely: [] as DeepDiveHolding[], maybe: [] as DeepDiveHolding[] },
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load agent intelligence',
      }
    }
  }, [])
}
