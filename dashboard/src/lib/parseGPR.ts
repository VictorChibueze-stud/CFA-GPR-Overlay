import { parse, isValid, format } from 'date-fns'
import type { GPRDataPoint } from '@/types'

/**
 * Strings that may appear in the `date` column for non-data rows
 * (e.g. the header row if not auto-stripped, or label rows).
 */
const SKIP_DATE_STRINGS = new Set([
  'DAY', 'N10D', 'GPRD', 'GPRD_ACT', 'GPRD_THREAT', 'date',
  'GPRD_MA30', 'GPRD_MA7', 'event', 'var_name', 'var_label',
])

/**
 * Binary search: count of elements in sorted array that are <= value.
 * Used for O(n log n) percentile computation.
 */
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

/**
 * Parse the GPR daily CSV into GPRDataPoint[].
 *
 * Known CSV quirks handled:
 * - First ~10 rows are metadata (non-empty var_name column) — skipped.
 * - Date column uses M/D/YYYY format, converted to ISO YYYY-MM-DD.
 * - Extra columns (DAY, N10D, var_name, var_label) are ignored.
 * - Percentile rank computed across the full parsed dataset.
 * - is_spike = true when percentile >= 0.99.
 */
export function parseGPRCsv(rawText: string): GPRDataPoint[] {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  // Parse header row to build column index map
  const headers = lines[0].split(',').map(h => h.trim())
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { idx[h] = i })

  const col = (row: string[], name: string): string =>
    ((idx[name] !== undefined ? row[idx[name]] : undefined) ?? '').trim()

  interface RawPoint {
    date: string
    gprd: number
    gprd_act: number
    gprd_threat: number
    gprd_ma30: number
    gprd_ma7: number
    event: string | null
  }

  const rawPoints: RawPoint[] = []
  const gprdValues: number[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',')

    // Skip metadata rows: var_name column is non-empty for the first ~10 rows
    const varName = col(row, 'var_name')
    if (varName) continue

    // Validate and parse date column
    const dateStr = col(row, 'date')
    if (!dateStr || SKIP_DATE_STRINGS.has(dateStr)) continue

    const parsedDate = parse(dateStr, 'M/d/yyyy', new Date())
    if (!isValid(parsedDate)) continue

    const isoDate = format(parsedDate, 'yyyy-MM-dd')

    const gprd       = parseFloat(col(row, 'GPRD'))      || 0
    const gprd_act   = parseFloat(col(row, 'GPRD_ACT'))  || 0
    const gprd_threat= parseFloat(col(row, 'GPRD_THREAT'))|| 0
    const gprd_ma30  = parseFloat(col(row, 'GPRD_MA30')) || 0
    const gprd_ma7   = parseFloat(col(row, 'GPRD_MA7'))  || 0
    const eventRaw   = col(row, 'event')

    rawPoints.push({
      date: isoDate,
      gprd,
      gprd_act,
      gprd_threat,
      gprd_ma30,
      gprd_ma7,
      event: eventRaw || null,
    })
    gprdValues.push(gprd)
  }

  const total = gprdValues.length
  if (total === 0) return []

  // Sort a copy for O(n log n) percentile lookups
  const sortedGprd = [...gprdValues].sort((a, b) => a - b)

  return rawPoints.map((pt, i) => {
    const percentile = countLessOrEqual(sortedGprd, gprdValues[i]) / total
    return {
      ...pt,
      percentile,
      is_spike: percentile >= 0.99,
    }
  })
}
