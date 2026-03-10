'use client'

import { useState, useEffect } from 'react'
import { parseGPRCsv } from '@/lib/parseGPR'
import type { GPRDataPoint } from '@/types'
import { fetchGPRSeries } from '@/lib/apiClient'

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true'

export function useGPRData() {
  const [data, setData] = useState<GPRDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // API mode
    if (USE_API) {
      setLoading(true)
      fetchGPRSeries('ALL')
        .then(json => {
          // API returns { date, gprd, gprd_ma7, gprd_ma30 } per point
          // Compute percentile rank locally from gprd values
          const gprdValues = json.data.map(p => p.gprd)
          const sortedGprd = [...gprdValues].sort((a, b) => a - b)

          function countLessOrEqual(sorted: number[], value: number): number {
            let lo = 0
            let hi = sorted.length
            while (lo < hi) {
              const mid = (lo + hi) >>> 1
              if (sorted[mid] <= value) lo = mid + 1
              else hi = mid
            }
            return lo
          }

          const mapped: GPRDataPoint[] = json.data.map((p: any, idx: number) => {
            const percentile = gprdValues.length > 0 ? countLessOrEqual(sortedGprd, gprdValues[idx]) / gprdValues.length : 0
            return {
              date: p.date,
              gprd: p.gprd,
              gprd_act: 0, // not provided by API
              gprd_threat: 0, // not provided by API
              gprd_ma30: p.gprd_ma30,
              gprd_ma7: p.gprd_ma7,
              event: null, // not provided by API
              percentile: percentile,
              is_spike: percentile >= 0.99,
            }
          })

          setData(mapped)
          setLoading(false)
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        })
      return
    }

    // Static mode (default)
    fetch('/data/gpr_daily.csv')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch GPR data: ${res.status} ${res.statusText}`)
        return res.text()
      })
      .then(text => {
        setData(parseGPRCsv(text))
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}
