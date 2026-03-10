import { parseGPRCsv } from '@/lib/parseGPR'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEADER = 'DAY,N10D,GPRD,GPRD_ACT,GPRD_THREAT,date,GPRD_MA30,GPRD_MA7,event,var_name,var_label'

function makeRow(opts: {
  date: string
  gprd?: number
  event?: string
  varName?: string
}): string {
  const gprd = opts.gprd ?? 100
  const event = opts.event ?? ''
  const varName = opts.varName ?? ''
  return `1,1,${gprd},${gprd},${gprd},${opts.date},${gprd},${gprd},${event},${varName},`
}

/**
 * Build a CSV with N real data rows (GPRD = 1 … N) and optional extra rows.
 * Each row gets a unique valid date: 1/1/<1985+i> so dates never overflow a month.
 */
function makeCsv(n: number, extraRows: string[] = []): string {
  const dataRows = Array.from({ length: n }, (_, i) => {
    // Use a different year for each row to guarantee valid M/D/YYYY dates
    const date = `1/1/${1985 + i}`
    return makeRow({ date, gprd: i + 1 })
  })
  return [HEADER, ...extraRows, ...dataRows].join('\n')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseGPRCsv', () => {
  test('1. parses M/D/YYYY date "1/1/1985" to ISO "1985-01-01"', () => {
    const csv = [HEADER, makeRow({ date: '1/1/1985', gprd: 100 })].join('\n')
    const result = parseGPRCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('1985-01-01')
  })

  test('2. skips metadata rows where date column contains non-date string like "date" or "DAY"', () => {
    const csv = [
      HEADER,
      // Row with date = "date" (would be the literal header string if processed without auto-skip)
      makeRow({ date: 'date', gprd: 999 }),
      // Row with date = "DAY"
      makeRow({ date: 'DAY', gprd: 999 }),
      // Row with non-empty var_name (matches real file metadata rows)
      makeRow({ date: '1/1/1985', gprd: 999, varName: 'GPRD' }),
      // Valid row
      makeRow({ date: '1/2/1985', gprd: 50 }),
    ].join('\n')
    const result = parseGPRCsv(csv)
    // Only the valid row should survive
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('1985-01-02')
    expect(result[0].gprd).toBe(50)
  })

  test('3. returns correct numeric gprd value', () => {
    const csv = [HEADER, makeRow({ date: '3/15/2022', gprd: 312.75 })].join('\n')
    const result = parseGPRCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].gprd).toBe(312.75)
  })

  test('4. sets is_spike = true for a row whose GPRD is at the 99th percentile', () => {
    // 100 rows: GPRD = 1…100. Row with GPRD=100 has percentile = 100/100 = 1.0 >= 0.99
    const csv = makeCsv(100)
    const result = parseGPRCsv(csv)
    expect(result).toHaveLength(100)
    const topRow = result.find(r => r.gprd === 100)
    expect(topRow).toBeDefined()
    expect(topRow!.is_spike).toBe(true)
    expect(topRow!.percentile).toBeGreaterThanOrEqual(0.99)
  })

  test('5. sets is_spike = false for a row at the 50th percentile', () => {
    // 100 rows: GPRD = 1…100. Row with GPRD=50 has percentile = 50/100 = 0.50
    const csv = makeCsv(100)
    const result = parseGPRCsv(csv)
    const midRow = result.find(r => r.gprd === 50)
    expect(midRow).toBeDefined()
    expect(midRow!.is_spike).toBe(false)
    expect(midRow!.percentile).toBeLessThan(0.99)
  })

  test('6. maps empty event column to null', () => {
    const csv = [HEADER, makeRow({ date: '1/1/1985', event: '' })].join('\n')
    const result = parseGPRCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].event).toBeNull()
  })

  test('7. returns empty array for empty input string', () => {
    expect(parseGPRCsv('')).toEqual([])
  })
})
