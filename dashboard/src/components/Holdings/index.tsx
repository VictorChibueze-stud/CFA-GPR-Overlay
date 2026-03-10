'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { useHoldings } from '@/hooks/useHoldings'
import { useIndustryImpact } from '@/hooks/useIndustryImpact'
import UploadZoneModal from './UploadZone'
import HoldingsTable from './HoldingsTable'
import ActiveSourceBanner from './ActiveSourceBanner'
import type { Holding } from '@/types'

type Direction = 'positive' | 'negative' | 'neutral'

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[48, 48, 48].map((h, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800" style={{ height: h }} />
      ))}
    </div>
  )
}

// ─── Portfolio Exposure donut ─────────────────────────────────────────────────

function ExposureDonut({
  allHoldings,
  impactDirections,
}: {
  allHoldings: Holding[]
  impactDirections: Record<string, Direction>
}) {
  const getDir = (h: Holding): Direction =>
    impactDirections[h.fed_industry_id] || impactDirections[h.fed_industry_name] || 'neutral'

  const resilient  = allHoldings.reduce((s, h) => getDir(h) === 'positive' ? s + h.weight_pct : s, 0)
  const vulnerable = allHoldings.reduce((s, h) => getDir(h) === 'negative' ? s + h.weight_pct : s, 0)
  const neutral    = Math.max(0, 100 - resilient - vulnerable)

  const data = [
    { name: 'Resilient',  value: parseFloat(resilient.toFixed(1)),  color: '#10b981' },
    { name: 'Vulnerable', value: parseFloat(vulnerable.toFixed(1)), color: '#ef4444' },
    { name: 'Neutral',    value: parseFloat(neutral.toFixed(1)),    color: '#334155' },
  ]

  const dominant = data.reduce((a, b) => b.value > a.value ? b : a)

  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <PieChart width={180} height={140}>
          <Pie
            data={data}
            innerRadius={42}
            outerRadius={62}
            dataKey="value"
            isAnimationActive={false}
            paddingAngle={1}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        {/* Center label */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span className="text-slate-300 text-xs font-bold">{dominant.name}</span>
          <span className="text-slate-500 text-[10px] font-medium">{dominant.value.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#64748b' }}>
              {d.name} {d.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Top Industries custom rows ───────────────────────────────────────────────

function TopIndustriesBar({
  allHoldings,
  impactDirections,
}: {
  allHoldings: Holding[]
  impactDirections: Record<string, Direction>
}) {
  const getDir = (h: Holding): Direction =>
    impactDirections[h.fed_industry_id] || impactDirections[h.fed_industry_name] || 'neutral'

  const totals: Record<string, { name: string; weight: number; direction: Direction }> = {}
  allHoldings.forEach(h => {
    const key = h.fed_industry_id || h.fed_industry_name || 'unknown'
    if (!totals[key]) {
      totals[key] = { name: h.fed_industry_name || key, weight: 0, direction: getDir(h) }
    }
    totals[key].weight += h.weight_pct
  })

  const top = Object.values(totals)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map(ind => ({
      name: ind.name.length > 22 ? ind.name.slice(0, 20) + '…' : ind.name,
      weight: parseFloat(ind.weight.toFixed(1)),
      direction: ind.direction,
    }))

  const maxWeight = top.length > 0 ? Math.max(...top.map(t => t.weight)) : 0

  return (
    <div>
      {top.map(ind => {
        const barWidth = maxWeight > 0 ? (ind.weight / maxWeight) * 100 : 0
        const barClass =
          ind.direction === 'positive' ? 'bg-emerald-500' :
          ind.direction === 'negative' ? 'bg-rose-500' :
          'bg-slate-500'
        return (
          <div key={ind.name} className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-[10px] font-bold w-36 truncate flex-shrink-0">
              {ind.name}
            </span>
            <div className="flex-1 h-1.5 bg-slate-800">
              <div
                className={barClass}
                style={{ width: `${barWidth}%`, height: '100%', transition: 'width 0.6s ease' }}
              />
            </div>
            <span className="text-slate-500 text-[10px] font-mono w-10 text-right flex-shrink-0">
              {ind.weight.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ExposureFilter = 'all' | 'positive' | 'negative' | 'neutral'

export default function HoldingsScreen() {
  const [uploadedHoldings, setUploadedHoldings] = useState<Holding[] | null>(null)
  const [exposureFilter, setExposureFilter] = useState<ExposureFilter>('all')

  const { allHoldings, activeSource, loading } = useHoldings(uploadedHoldings)
  const { industries } = useIndustryImpact()

  const impactDirections = industries.reduce<Record<string, Direction>>(
    (acc, ind) => {
      const dir = ind.direction as Direction
      if (ind.fed_industry_id)   acc[ind.fed_industry_id]   = dir
      if (ind.fed_industry_name) acc[ind.fed_industry_name] = dir
      return acc
    },
    {},
  )

  const fundName =
    activeSource === 'uploaded'
      ? 'Uploaded Portfolio'
      : 'iShares LCTD (Default)'

  const showCharts = !loading && allHoldings.length > 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Banner — full width */}
      <ActiveSourceBanner
        source={activeSource}
        fundName={fundName}
        holdingCount={allHoldings.length}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4">

        {/* Subtitle bar */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            Analysing:
          </span>
          <span className="text-[#f8fafc] text-xs font-bold ml-1">{fundName}</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-400 text-xs font-medium">{allHoldings.length} holdings</span>
          <span className="text-slate-700">·</span>
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
            {activeSource === 'uploaded' ? 'Uploaded' : 'Default dataset'}
          </span>
        </div>

        {/* Visualisation row */}
        {showCharts && (
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1 — Exposure donut */}
            <div className="bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>
                  donut_large
                </span>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  PORTFOLIO EXPOSURE
                </span>
              </div>
              <ExposureDonut allHoldings={allHoldings} impactDirections={impactDirections} />
            </div>

            {/* Card 2 — Top industries */}
            <div className="bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>
                  bar_chart
                </span>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  TOP INDUSTRIES BY WEIGHT
                </span>
              </div>
              <TopIndustriesBar allHoldings={allHoldings} impactDirections={impactDirections} />
            </div>
          </div>
        )}

        {/* Holdings section header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>
              table_rows
            </span>
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              HOLDINGS
            </span>
          </div>
          <UploadZoneModal onUploadSuccess={setUploadedHoldings} />
        </div>

        {/* Exposure filter tabs */}
        <div className="flex gap-4 border-b border-slate-800">
          {([
            { label: 'ALL',        value: 'all'      as ExposureFilter },
            { label: 'VULNERABLE', value: 'negative' as ExposureFilter },
            { label: 'RESILIENT',  value: 'positive' as ExposureFilter },
            { label: 'NEUTRAL',    value: 'neutral'  as ExposureFilter },
          ]).map(({ label, value }) => {
            const isActive = exposureFilter === value
            return (
              <button
                key={value}
                onClick={() => setExposureFilter(isActive && value !== 'all' ? 'all' : value)}
                className={`pb-1 font-black text-[10px] uppercase tracking-wider transition-colors ${isActive ? 'text-[#f8fafc]' : 'text-slate-500 hover:text-slate-300'}`}
                style={{ background: 'none', border: 'none', borderBottom: isActive ? '2px solid #60a5fa' : '2px solid transparent', cursor: 'pointer', paddingBottom: 4 }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Table */}
        {loading ? (
          <Skeleton />
        ) : (
          <HoldingsTable holdings={allHoldings} impactDirections={impactDirections} exposureFilter={exposureFilter} />
        )}
      </div>
    </div>
  )
}
