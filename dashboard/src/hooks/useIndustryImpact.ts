'use client'

import { useState, useEffect, useMemo } from 'react'
import impactJson from '@/data/impact.json'
import advisoryJson from '@/data/advisory.json'
import type { IndustryImpact, EventSummary } from '@/types'
import { fetchImpact } from '@/lib/apiClient'

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true'

function toTitleCase(id: string): string {
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function useIndustryImpact() {
  const [apiData, setApiData] = useState<{
    industries: IndustryImpact[]
    summary: EventSummary
  } | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!USE_API) return

    setApiLoading(true)
    fetchImpact()
      .then(json => {
        // json has shape: { event, impact, report }
        // impact.model_dump() contains the EventImpactProfile structure
        // report.model_dump() contains the AdvisoryReport structure

        const impactData = json.impact as Record<string, any>
        const reportData = json.report as Record<string, any>
        const eventData = json.event as Record<string, any>

        // Extract industries from impact (assuming impact has an "impact_by_industry" or similar structure)
        // The EventImpactProfile likely has industries or similar
        const rawIndustries: Array<{
          fed_industry_id: string
          fed_industry_name?: string
          portfolio_weight?: number
          gpr_beta?: number
          impact_score?: number
          direction?: string
        }> = (impactData.impact_by_industry || impactData.industries || [])

        const industries: IndustryImpact[] = rawIndustries.map(ind => ({
          fed_industry_id: ind.fed_industry_id,
          fed_industry_name: ind.fed_industry_name ?? toTitleCase(ind.fed_industry_id),
          portfolio_weight: ind.portfolio_weight ?? 0,
          gpr_beta: ind.gpr_beta ?? 0,
          impact_score: ind.impact_score ?? 0,
          direction: (ind.direction ?? 'neutral') as IndustryImpact['direction'],
        }))

        // Extract summary from report and event
        const summary: EventSummary = {
          fund_name: reportData.fund_name ?? 'iShares LCTD',
          as_of_date: reportData.as_of_date ?? new Date().toISOString().split('T')[0],
          event_id: eventData.event_id ?? reportData.event_id,
          peak_date: eventData.peak_date ?? reportData.peak_date,
          severity_score: eventData.severity_score ?? reportData.severity_score ?? 0,
          percentile: eventData.percentile ?? reportData.percentile ?? 0,
          net_impact: impactData.net_impact ?? reportData.net_impact,
          portfolio_vulnerability_baseline: impactData.portfolio_vulnerability_baseline ?? reportData.portfolio_vulnerability_baseline ?? 0,
        }

        setApiData({ industries, summary })
        setApiError(null)
      })
      .catch(err => {
        setApiError(err instanceof Error ? err.message : 'Failed to load impact data')
      })
      .finally(() => setApiLoading(false))
  }, [])

  // Static mode (default)
  const staticData = useMemo(() => {
    try {
      // impact.json already includes fed_industry_name; toTitleCase is the fallback
      const industries: IndustryImpact[] = (impactJson.industries as Array<{
        fed_industry_id: string
        fed_industry_name?: string
        portfolio_weight: number
        gpr_beta: number
        impact_score: number
        direction: string
      }>).map(ind => ({
        fed_industry_id: ind.fed_industry_id,
        fed_industry_name: ind.fed_industry_name ?? toTitleCase(ind.fed_industry_id),
        portfolio_weight: ind.portfolio_weight ?? 0,
        gpr_beta: ind.gpr_beta ?? 0,
        impact_score: ind.impact_score ?? 0,
        direction: (ind.direction ?? 'neutral') as IndustryImpact['direction'],
      }))

      const adv = advisoryJson as {
        fund_name: string
        as_of_date: string
        event: {
          event_id: string
          peak_date: string
          severity_score: number
          percentile: number
        }
        net_event_impact: number
        portfolio_vulnerability_baseline: number
      }

      const summary: EventSummary = {
        fund_name: adv.fund_name ?? 'iShares LCTD',
        as_of_date: adv.as_of_date,
        event_id: adv.event.event_id,
        peak_date: adv.event.peak_date ?? adv.as_of_date,
        severity_score: adv.event.severity_score,
        percentile: adv.event.percentile,
        net_impact: adv.net_event_impact,
        portfolio_vulnerability_baseline: adv.portfolio_vulnerability_baseline,
      }

      return { industries, summary }
    } catch (err) {
      return {
        industries: [] as IndustryImpact[],
        summary: null as unknown as EventSummary,
      }
    }
  }, [])

  // Return API data if available, otherwise static
  const data = USE_API && apiData ? apiData : staticData

  return {
    industries: data.industries,
    summary: data.summary,
    loading: USE_API ? apiLoading : false,
    error: USE_API ? apiError : null,
  }
}

