'use client'

import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import holdingsJson from '@/data/holdings_shortlist.json'
import type { Holding } from '@/types'

type CsvRow = Record<string, string>

type CsvLookup = Map<string, { ticker: string; gpr_beta: number | null; region: string | null; country: string | null }>

function buildFromShortlist(csvLookup: CsvLookup, uploadedHoldings?: Holding[] | null) {
  if (uploadedHoldings && uploadedHoldings.length > 0) {
    const holdingsByIndustry: Record<string, Holding[]> = {}
    for (const h of uploadedHoldings) {
      const key = h.fed_industry_name || 'Unknown'
      if (!holdingsByIndustry[key]) holdingsByIndustry[key] = []
      holdingsByIndustry[key].push(h)
    }
    return {
      allHoldings: uploadedHoldings,
      holdingsByIndustry,
      activeSource: 'uploaded' as const,
    }
  }

  const raw = (holdingsJson as { shortlists_by_industry: Record<string, Array<{
    security_name_report?: string
    ticker_guess?: string
    weight_pct?: number
    fed_industry_name?: string
    fed_industry_id?: string
    industry_weight_share_for_holding?: number
    region_guess?: string | null
    country_guess?: string | null
  }>> }).shortlists_by_industry

  const holdingsByIndustry: Record<string, Holding[]> = {}

  for (const [industryName, items] of Object.entries(raw)) {
    holdingsByIndustry[industryName] = items.map(item => {
      const name = (item.security_name_report || '').trim().toLowerCase()
      const csvData = name ? csvLookup.get(name) : undefined
      return {
        security_name_report: item.security_name_report ?? '',
        ticker_guess: (csvData?.ticker ?? item.ticker_guess) || '—',
        weight_pct: item.weight_pct ?? 0,
        fed_industry_name: item.fed_industry_name ?? industryName,
        fed_industry_id: item.fed_industry_id ?? '',
        industry_weight_share_for_holding: item.industry_weight_share_for_holding ?? 0,
        region_guess: csvData?.region ?? item.region_guess ?? '—',
        country_guess: csvData?.country ?? item.country_guess ?? '—',
        // attach gpr_beta if present
        gpr_beta: csvData?.gpr_beta ?? null,
      } as unknown as Holding
    })
  }

  const allHoldings = Object.values(holdingsByIndustry).flat()
  return {
    allHoldings,
    holdingsByIndustry,
    activeSource: 'default' as const,
  }
}

export function useHoldings(uploadedHoldings?: Holding[] | null) {
  const [csvLookup, setCsvLookup] = useState<CsvLookup>(new Map())
  const [csvLoaded, setCsvLoaded] = useState(false)
  // loading is true only while waiting for the default CSV fetch
  const loading = !csvLoaded && !(uploadedHoldings && uploadedHoldings.length > 0)

  useEffect(() => {
    // Only fetch default CSV if no holdings are uploaded
    if (uploadedHoldings && uploadedHoldings.length > 0) {
      return
    }
    fetch('/data/portfolio_default.csv')
      .then(r => r.text())
      .then(text => {
        const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true })
        const map: CsvLookup = new Map()
          for (const row of result.data) {
                const name = (row.security_name_report || row['Security Name'] || row['security_name_report'] || '').trim()
                if (!name) continue
                const key = name.toLowerCase()
                const ticker = row.ticker_guess || row.Ticker || row['ticker'] || ''
                const gprRaw = row.gpr_beta || row['GPR Beta'] || row['gpr_beta'] || ''
                const gpr = gprRaw === '' ? null : Number.parseFloat(gprRaw)
                const region = row.region_guess || row.Region || row['region'] || null
                const country = row.country_guess || row.Country || row['country'] || null
                map.set(key, {
                  ticker: ticker || '—',
                  gpr_beta: Number.isNaN(gpr as number) ? null : (gpr as number),
                  region: region || null,
                  country: country || null,
                })
              }
        setCsvLookup(map)
      })
      .catch(() => {/* silent: fall back to shortlist data */})
      .finally(() => setCsvLoaded(true))
  }, [uploadedHoldings])

  const result = useMemo(() => {
    try {
      return buildFromShortlist(csvLookup, uploadedHoldings)
    } catch {
      return {
        allHoldings: [] as Holding[],
        holdingsByIndustry: {} as Record<string, Holding[]>,
        activeSource: 'default' as const,
      }
    }
  }, [csvLookup, uploadedHoldings])

  return {
    ...result,
    loading,
    error: null,
  }
}
