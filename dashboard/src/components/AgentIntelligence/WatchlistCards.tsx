'use client'

import type { WatchlistHolding } from '@/types'

// ─── Badge helpers ────────────────────────────────────────────────────────────

function verdictLabel(v: string): string {
  if (v === 'likely_affected') return 'Likely Affected'
  if (v === 'maybe_affected') return 'Maybe Affected'
  return 'No Change'
}

function verdictStyle(v: string): React.CSSProperties {
  if (v === 'likely_affected') return {
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
  }
  if (v === 'maybe_affected') return {
    backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)',
  }
  return { backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }
}

function actionLabel(a: string): string {
  return a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionStyle(a: string): React.CSSProperties {
  if (a === 'reduce' || a === 'risk_review') return {
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
  }
  if (a === 'monitor_closely' || a === 'monitor') return {
    backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)',
  }
  return { backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }
}

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 6px',
  fontSize: '9px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '-0.02em',
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const fillColor =
    value >= 0.8 ? '#10b981' :
    value >= 0.6 ? '#60a5fa' :
    '#ef4444'

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex-1 h-1 bg-slate-900" style={{ overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: fillColor }} />
      </div>
      <span
        className="text-slate-500 text-[10px] font-bold"
        style={{ width: 32, textAlign: 'right', flexShrink: 0 }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  holdings: WatchlistHolding[]
}

export default function WatchlistCards({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div
        className="p-6"
        style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)' }}
      >
        No watchlist holdings found
      </div>
    )
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-3">
      {holdings.map(h => (
        <div
          key={h.resolved_symbol}
          className="bg-slate-900 border border-slate-800 p-5 cursor-pointer transition-colors"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,41,59,0.5)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = ''
          }}
        >
          {/* Header row */}
          <div className="flex justify-between items-start">
            {/* Left: name + ticker */}
            <div>
              <div className="text-white text-sm font-black tracking-tight uppercase">
                {h.company_name}
              </div>
              <div className="text-slate-500 text-[10px] font-bold tracking-tight mt-0.5">
                {h.resolved_symbol}
                {h.weight_pct > 0 && (
                  <span style={{ marginLeft: 8 }}>{h.weight_pct.toFixed(2)}%</span>
                )}
              </div>
            </div>

            {/* Right: verdict + action badges */}
            <div className="flex flex-col items-end gap-1">
              <span style={{ ...BADGE_BASE, ...verdictStyle(h.final_exposure_verdict) }}>
                {verdictLabel(h.final_exposure_verdict)}
              </span>
              <span style={{ ...BADGE_BASE, ...actionStyle(h.recommendation_action) }}>
                {actionLabel(h.recommendation_action)}
              </span>
            </div>
          </div>

          {/* Description / news angle */}
          {h.news_angle && (
            <p
              className="mt-3 text-slate-400 text-xs font-medium italic leading-relaxed"
              style={{
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}
            >
              {h.news_angle}
            </p>
          )}

          {/* Confidence bar */}
          <ConfidenceBar value={h.confidence} />
        </div>
      ))}
    </div>
  )
}
