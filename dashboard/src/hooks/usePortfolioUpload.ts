'use client'

import Papa from 'papaparse'
import type { Holding } from '@/types'
import { uploadPortfolio } from '@/lib/apiClient'

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true'

const REQUIRED_COLUMNS = [
  'security_name_report',
  'weight_pct',
  'fed_industry_id',
  'fed_industry_name',
] as const

interface ParseResult {
  holdings: Holding[] | null
  impact_analysis: any | null
  error: string | null
}

export function usePortfolioUpload() {
  const parseFile = (file: File): Promise<ParseResult> => {
    // API mode: upload to backend pipeline
    if (USE_API) {
      return uploadPortfolio(file)
        .then(json => {
          // API returns { event, impact, report }
          // Extract holdings from impact analysis if available
          const impactData = json.impact as Record<string, any>
          const rawIndustries: Array<{
            fed_industry_id: string
            fed_industry_name?: string
            weight_pct?: number
            ticker_guess?: string
            region_guess?: string | null
            country_guess?: string | null
          }> = impactData.impact_by_industry || impactData.industries || []

          const holdings: Holding[] = rawIndustries.map(ind => ({
            security_name_report: ind.fed_industry_name || '',
            ticker_guess: ind.ticker_guess || '',
            weight_pct: ind.weight_pct ?? 0,
            fed_industry_name: ind.fed_industry_name ?? '',
            fed_industry_id: ind.fed_industry_id,
            industry_weight_share_for_holding: 0,
            region_guess: ind.region_guess ?? null,
            country_guess: ind.country_guess ?? null,
          }))

          return {
            holdings,
            impact_analysis: json, // { event, impact, report }
            error: null,
          }
        })
        .catch(err => ({
          holdings: null,
          impact_analysis: null,
          error: err instanceof Error ? err.message : String(err),
        }))
    }

    // Static mode: parse locally with PapaParse
    return new Promise(resolve => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const rows = results.data
          if (rows.length === 0) {
            resolve({ holdings: null, impact_analysis: null, error: 'File is empty' })
            return
          }

          const presentCols = Object.keys(rows[0])
          const missing = REQUIRED_COLUMNS.filter(c => !presentCols.includes(c))
          if (missing.length > 0) {
            resolve({
              holdings: null,
              impact_analysis: null,
              error: `Missing required columns: ${missing.join(', ')}`,
            })
            return
          }

          const holdings: Holding[] = rows.map(row => ({
            security_name_report: row.security_name_report ?? '',
            ticker_guess: row.ticker_guess ?? '',
            weight_pct: parseFloat(row.weight_pct) || 0,
            fed_industry_name: row.fed_industry_name ?? '',
            fed_industry_id: row.fed_industry_id ?? '',
            industry_weight_share_for_holding:
              parseFloat(row.industry_weight_share_for_holding) || 0,
            region_guess: row.region_guess || null,
            country_guess: row.country_guess || null,
          }))

          resolve({ holdings, impact_analysis: null, error: null })
        },
        error(err) {
          resolve({ holdings: null, impact_analysis: null, error: err.message })
        },
      })
    })
  }

  return { parseFile }
}
