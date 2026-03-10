'use client'

import { useGPRData } from '@/hooks/useGPRData'
import { useIndustryImpact } from '@/hooks/useIndustryImpact'
import GPRChart from './GPRChart'
import EventSummaryCard from './EventSummaryCard'

function Skeleton() {
  return (
    <div className="flex gap-4 p-6">
      <div className="flex-1">
        <div className="h-8 bg-slate-900 border border-slate-800 mb-3 w-48" />
        <div className="bg-slate-900 border border-slate-800" style={{ height: 500 }} />
      </div>
      <div className="bg-slate-900 border border-slate-800 flex-shrink-0" style={{ width: 288, height: 480 }} />
    </div>
  )
}

export default function EventMonitorScreen() {
  const { data, loading, error } = useGPRData()
  const { summary, error: impactError } = useIndustryImpact()

  if (loading || data.length === 0) return <Skeleton />

  if (error) {
    return (
      <div className="p-6 text-xs font-mono" style={{ color: 'var(--color-red)' }}>
        Error loading GPR data: {error}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Section heading row */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 16 }}>monitoring</span>
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">GPR DAILY INDEX</span>
        <span className="text-slate-700 mx-1">·</span>
        <span className="text-slate-500 text-[10px] font-medium">1985 — present · Caldara &amp; Iacoviello (2022)</span>
      </div>

      {/* Main content row */}
      <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
        {/* Left: chart card */}
        <div className="flex-1 min-w-0 bg-slate-900 border border-slate-800 flex flex-col p-5">
          <div className="flex-1 min-h-0 w-full">
            <GPRChart data={data} />
          </div>
        </div>

        {/* Right: event summary card */}
        <div className="w-72 flex-shrink-0 h-full">
          {impactError || !summary ? (
            <div
              className="bg-slate-900 border border-slate-800 p-5 text-xs font-mono"
              style={{ color: 'var(--color-muted)' }}
            >
              {impactError ?? 'No event data available'}
            </div>
          ) : (
            <EventSummaryCard summary={summary} />
          )}
        </div>
      </div>
    </div>
  )
}
