'use client'

import type { EventSummary } from '@/types'

interface Props {
  summary: EventSummary
}

export default function EventSummaryCard({ summary }: Props) {
  const isExtreme = summary.percentile >= 0.995

  const severityColor =
    summary.severity_score >= 0.95 ? 'text-rose-400' :
    summary.severity_score >= 0.80 ? 'text-amber-400' :
    'text-[#f8fafc]'

  const percentileColor =
    summary.percentile >= 0.995 ? 'text-rose-400' :
    summary.percentile >= 0.80  ? 'text-amber-400' :
    'text-[#f8fafc]'

  const netImpact = summary.net_impact ?? 0
  const netImpactColor =
    netImpact < 0 ? 'text-rose-400' :
    netImpact > 0 ? 'text-emerald-400' :
    'text-[#f8fafc]'

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 flex flex-col h-full">
      {/* Header */}
      <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
        ACTIVE EVENT
      </div>
      <div className="text-[#60a5fa] text-xs font-black font-mono mb-3 break-all">
        {summary.event_id}
      </div>

      <div className="border-t border-slate-800 my-3" />

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Peak Date</div>
          <div className="text-[#f8fafc] text-lg font-black font-mono">{summary.peak_date}</div>
        </div>
        <div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Severity</div>
          <div className={`font-black text-lg font-mono ${severityColor}`}>
            {summary.severity_score.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Percentile</div>
          <div className={`font-black text-lg font-mono ${percentileColor}`}>
            {(summary.percentile * 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Net Impact</div>
          <div className={`font-black text-lg font-mono ${netImpactColor}`}>
            {netImpact > 0 ? '+' : ''}{netImpact.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 my-3" />

      {/* Event type */}
      <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-2">EVENT TYPE</div>
      <div>
        {isExtreme ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">EXTREME SPIKE</span>
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">ELEVATED SPIKE</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 my-3" />

      {/* Fund info */}
      <div className="mt-auto">
        <div className="text-slate-400 text-[11px] font-medium">{summary.fund_name}</div>
        <div className="text-slate-500 text-[10px] font-medium mt-0.5">As of: {summary.as_of_date}</div>
      </div>
    </div>
  )
}
