'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Holding } from '@/types'

type Direction = 'positive' | 'negative' | 'neutral'
type ExposureFilter = 'all' | 'positive' | 'negative' | 'neutral'

interface Props {
  holdings: Holding[]
  impactDirections: Record<string, Direction>
  exposureFilter?: ExposureFilter
}

const PAGE_SIZE = 25

function ExposureBadge({ direction }: { direction: Direction }) {
  if (direction === 'negative') {
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter bg-rose-500/10 text-rose-500 border border-rose-500/20">
        Vulnerable
      </span>
    )
  }
  if (direction === 'positive') {
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
        Resilient
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter bg-slate-800 text-slate-400 border border-slate-700">
      Neutral
    </span>
  )
}

export default function HoldingsTable({ holdings, impactDirections, exposureFilter = 'all' }: Props) {
  const [searchQuery, setSearchQuery]       = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [currentPage, setCurrentPage]       = useState(0)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const getDirection = useCallback(
    (h: Holding): Direction =>
      impactDirections[h.fed_industry_id] ||
      impactDirections[h.fed_industry_name] ||
      'neutral',
    [impactDirections],
  )

  const industryNames = useMemo(
    () => [...new Set(holdings.map(h => h.fed_industry_name).filter(Boolean))].sort(),
    [holdings],
  )

  const filtered = useMemo(() => {
    let list = [...holdings]
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(h => h.security_name_report.toLowerCase().includes(q))
    }
    if (industryFilter !== 'all') {
      list = list.filter(h => h.fed_industry_name === industryFilter)
    }
    if (exposureFilter !== 'all') {
      list = list.filter(h => getDirection(h) === exposureFilter)
    }
    list.sort((a, b) => (b.weight_pct as number) - (a.weight_pct as number))
    return list
  }, [holdings, searchQuery, industryFilter, exposureFilter, getDirection])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages - 1)
  const pageStart  = safePage * PAGE_SIZE
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const displayed  = filtered.slice(pageStart, pageEnd)

  function handleFilterChange(setter: (v: string) => void, v: string) {
    setter(v)
    setCurrentPage(0)
  }

  function toggleRow(key: string) {
    setExpandedRowId(prev => (prev === key ? null : key))
  }

  const selectClass =
    'bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-400 font-medium focus:outline-none'

  return (
    <div>
      {/* Filter row */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search by name…"
          value={searchQuery}
          onChange={e => handleFilterChange(setSearchQuery, e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none focus:border-slate-600"
          style={{ minWidth: 180 }}
        />
        <select
          value={industryFilter}
          onChange={e => handleFilterChange(setIndustryFilter, e.target.value)}
          className={selectClass}
        >
          <option value="all">All Industries</option>
          {industryNames.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="w-full bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Security Name</th>
              <th className="px-4 py-3 text-left text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Ticker</th>
              <th className="px-4 py-3 text-left text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Industry</th>
              <th className="px-4 py-3 text-right text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Weight %</th>
              <th className="px-4 py-3 text-right text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Ind. Share %</th>
              <th className="px-4 py-3 text-right text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Exposure</th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-slate-500 text-xs font-mono"
                >
                  No holdings match your filters
                </td>
              </tr>
            ) : (
              displayed.flatMap((holding, idx) => {
                const rowKey   = `${holding.security_name_report}-${pageStart + idx}`
                const isExpanded = expandedRowId === rowKey
                const direction  = getDirection(holding)

                return [
                  <tr
                    key={rowKey}
                    onClick={() => toggleRow(rowKey)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td
                      className="py-3 px-4 text-[#f8fafc] text-xs font-bold uppercase tracking-tight"
                      style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {holding.security_name_report}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-bold font-mono">
                      {holding.ticker_guess || '—'}
                    </td>
                    <td
                      className="py-3 px-4 text-slate-400 text-xs font-medium"
                      style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {holding.fed_industry_name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono text-right tabular-nums">
                      {holding.weight_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono text-right tabular-nums">
                      {(holding.industry_weight_share_for_holding * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ExposureBadge direction={direction} />
                    </td>
                  </tr>,

                  isExpanded && (
                    <tr key={`${rowKey}-detail`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="bg-slate-950 border-l-2 border-slate-700 px-5 py-4">
                          <div className="grid grid-cols-4 gap-4">
                            {[
                              { label: 'Industry ID', value: holding.fed_industry_id || '—' },
                              { label: 'Ticker',      value: holding.ticker_guess || '—' },
                              { label: 'GPR Beta',    value: typeof holding.gpr_beta === 'number' ? holding.gpr_beta.toFixed(4) : 'N/A' },
                              { label: 'Region',      value: holding.region_guess || holding.country_guess || '—' },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">
                                  {label}
                                </div>
                                <div className="text-slate-300 text-xs font-bold font-mono">
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean)
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-800">
          <span className="text-slate-500 text-[10px] font-bold">
            Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length} holdings
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-3 py-1.5 border border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider hover:border-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'transparent' }}
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="px-3 py-1.5 border border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider hover:border-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'transparent' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
