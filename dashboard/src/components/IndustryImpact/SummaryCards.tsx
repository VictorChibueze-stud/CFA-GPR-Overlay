'use client'

import { useEffect, useRef, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { EventSummary, IndustryImpact } from '@/types'

interface Props {
  summary: EventSummary
  industries: IndustryImpact[]
}

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    const start = Date.now()
    function tick() {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 2)
      setValue(target * eased)
      if (t < 1) requestAnimationFrame(tick)
      else setValue(target)
    }
    requestAnimationFrame(tick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return value
}

interface CardDef {
  label: string
  rawValue: number
  format: (v: number) => string
  colorClass: string
  tooltip: string
  iconName: string
  subLabel: string
}

function MetricCard({ label, rawValue, format, colorClass, tooltip, iconName, subLabel }: CardDef) {
  const animated = useCountUp(rawValue)

  return (
    <div className="bg-slate-900 border border-slate-800 p-5">
      {/* Top row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            {label}
          </span>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--color-muted)', display: 'flex', alignItems: 'center',
                }}
                aria-label={`Info: ${label}`}
              >
                <span style={{ fontSize: 10 }}>?</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-muted)',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.6875rem',
                  padding: '6px 10px',
                  maxWidth: 260,
                  lineHeight: 1.5,
                  zIndex: 50,
                }}
              >
                {tooltip}
                <Tooltip.Arrow style={{ fill: 'var(--color-border)' }} />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        {/* Icon circle */}
        <div className="w-7 h-7 bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>
            {iconName}
          </span>
        </div>
      </div>

      {/* Big number */}
      <div
        className={`stat-value text-3xl mb-1 ${colorClass}`}
        style={{ fontFamily: 'var(--font-family-mono)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
      >
        {format(animated)}
      </div>

      {/* Sub-label */}
      <div className="text-slate-500 text-[10px] font-medium">{subLabel}</div>
    </div>
  )
}

export default function SummaryCards({ summary, industries }: Props) {
  const vulnerableExposure = industries
    .filter(i => i.direction === 'negative')
    .reduce((sum, i) => sum + i.portfolio_weight, 0)

  const resilientExposure = industries
    .filter(i => i.direction === 'positive')
    .reduce((sum, i) => sum + i.portfolio_weight, 0)

  const netImpact = summary.net_impact ?? 0
  const netColorClass = netImpact < 0 ? 'text-rose-400' : 'text-emerald-400'
  const netIconName  = netImpact < 0 ? 'trending_down' : 'trending_up'

  const cards: CardDef[] = [
    {
      label: 'Net Event Impact',
      rawValue: netImpact,
      format: (v) => v.toFixed(6),
      colorClass: netColorClass,
      tooltip: 'Sum of all industry impact scores. Negative = portfolio net hurt by this event.',
      iconName: netIconName,
      subLabel: 'portfolio-weighted',
    },
    {
      label: 'Vulnerable Exposure',
      rawValue: vulnerableExposure,
      format: (v) => `${v.toFixed(2)}%`,
      colorClass: 'text-rose-400',
      tooltip: 'Total portfolio weight in industries with negative GPR beta.',
      iconName: 'warning',
      subLabel: 'of total allocation',
    },
    {
      label: 'Resilient Exposure',
      rawValue: resilientExposure,
      format: (v) => `${v.toFixed(2)}%`,
      colorClass: 'text-emerald-400',
      tooltip: 'Total portfolio weight in industries with positive GPR beta.',
      iconName: 'shield',
      subLabel: 'of total allocation',
    },
    {
      label: 'Vulnerability Baseline',
      rawValue: summary.portfolio_vulnerability_baseline,
      format: (v) => v.toFixed(6),
      colorClass: 'text-[#f8fafc]',
      tooltip: 'Portfolio impact at maximum severity spike (severity = 1.0).',
      iconName: 'gps_fixed',
      subLabel: 'at max severity',
    },
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>
    </Tooltip.Provider>
  )
}
