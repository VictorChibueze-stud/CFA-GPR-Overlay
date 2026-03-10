'use client'

import type { IndustryImpact } from '@/types'

interface Props {
  industries: IndustryImpact[]
  direction: 'positive' | 'negative'
}

export default function ImpactBarChart({ industries, direction }: Props) {
  const isPositive = direction === 'positive'
  const maxAbsImpact = Math.max(...industries.map(i => Math.abs(i.impact_score)), 0)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        {isPositive ? (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10b981' }}>shield</span>
            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">
              RESILIENT INDUSTRIES
            </span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ef4444' }}>warning</span>
            <span className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em]">
              VULNERABLE INDUSTRIES
            </span>
          </>
        )}
      </div>

      {/* Industry rows */}
      <div className="space-y-3">
        {industries.length === 0 ? (
          <span className="text-slate-500 text-xs">None</span>
        ) : (
          industries.map(ind => {
            const barWidth = maxAbsImpact > 0 ? (Math.abs(ind.impact_score) / maxAbsImpact) * 100 : 0
            const betaPos = ind.gpr_beta >= 0
            return (
              <div key={ind.fed_industry_id} className="flex flex-col gap-1.5">
                {/* Top line */}
                <div className="flex justify-between items-center">
                  <span
                    className="text-slate-300 text-xs font-bold uppercase tracking-tight flex-1"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {ind.fed_industry_name}
                  </span>
                  <span className="text-slate-500 text-[10px] font-bold font-mono w-12 text-right flex-shrink-0">
                    {ind.portfolio_weight.toFixed(2)}%
                  </span>
                  <span
                    className={`px-1.5 py-0.5 bg-slate-950 border border-slate-800 ml-2 text-[10px] font-bold font-mono flex-shrink-0 ${betaPos ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    β{betaPos ? '+' : ''}{ind.gpr_beta.toFixed(4)}
                  </span>
                </div>
                {/* Bar */}
                <div className="w-full h-1.5 bg-slate-800">
                  <div
                    className={isPositive ? 'bg-emerald-500' : 'bg-rose-500'}
                    style={{ width: `${barWidth}%`, height: '100%', transition: 'width 0.6s ease' }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
