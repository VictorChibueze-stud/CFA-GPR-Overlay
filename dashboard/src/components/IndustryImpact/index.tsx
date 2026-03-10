'use client'

import { useIndustryImpact } from '@/hooks/useIndustryImpact'
import ImpactScatterPlot from './ImpactScatterPlot'
import ImpactBarChart from './ImpactBarChart'
import SummaryCards from './SummaryCards'
import ExportButton from './ExportButton'
import type { IndustryImpact, EventSummary } from '@/types'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[120, 320, 480].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

// ─── Findings summary ─────────────────────────────────────────────────────────

interface FindingsSummaryProps {
  industries: IndustryImpact[]
  summary: EventSummary
}

function computeTilts(industries: IndustryImpact[]) {
  const sortedW = [...industries.map(i => i.portfolio_weight)].sort((a, b) => a - b)
  const median = sortedW[Math.floor(sortedW.length / 2)] ?? 0
  const tiltDown = [...industries]
    .filter(i => i.direction === 'negative' && i.portfolio_weight > median)
    .sort((a, b) => a.impact_score - b.impact_score)
    .slice(0, 3)
  const tiltUp = [...industries]
    .filter(i => i.direction === 'positive' && i.portfolio_weight < median)
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 2)
  return { tiltDown, tiltUp, median }
}

function FindingsSummary({ industries, summary }: FindingsSummaryProps) {
  const vulnerable = [...industries]
    .filter(i => i.direction === 'negative')
    .sort((a, b) => a.impact_score - b.impact_score)
  const resilient = [...industries]
    .filter(i => i.direction === 'positive')
    .sort((a, b) => b.impact_score - a.impact_score)

  const netDirection = (summary.net_impact ?? 0) < 0 ? 'net negative' : 'net positive'
  const top1 = vulnerable[0]?.fed_industry_name ?? 'unknown'
  const top2 = vulnerable[1]?.fed_industry_name
  const hedge = resilient[0]?.fed_industry_name ?? 'unknown'
  const impactStr = typeof summary.net_impact === 'number' ? summary.net_impact.toFixed(6) : 'N/A'
  const dateStr = summary.peak_date ?? summary.event_id ?? 'the event date'
  const fundStr = summary.fund_name ?? 'the portfolio'

  const { tiltDown, tiltUp } = computeTilts(industries)
  const reduce1 = tiltDown[0]?.fed_industry_name
  const reduce2 = tiltDown[1]?.fed_industry_name
  const increase1 = tiltUp[0]?.fed_industry_name

  return (
    <div className="bg-slate-900 border border-slate-800 px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em]">
          EVENT FINDINGS
        </span>
      </div>
      <p style={{ fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
        On {dateStr}, {fundStr} recorded{' '}
        <span style={{ color: netDirection === 'net negative' ? 'var(--color-red)' : 'var(--color-green)', fontWeight: 600 }}>
          {netDirection} GPR impact of {impactStr}
        </span>
        {'. '}
        {top2 ? `${top1} and ${top2} are the primary vulnerable exposures.` : `${top1} is the primary vulnerable exposure.`}
        {resilient.length > 0 && ` ${hedge} provides a partial natural hedge.`}
        {(reduce1 || increase1) && (
          <>
            {' '}Recommended:{' '}
            {reduce1 && reduce2
              ? `reduce ${reduce1} and ${reduce2} exposure`
              : reduce1
              ? `reduce ${reduce1} exposure`
              : null}
            {reduce1 && increase1 ? '; ' : ''}
            {increase1 ? `consider increasing ${increase1}` : null}.
          </>
        )}
      </p>
    </div>
  )
}

// ─── Recommendation card ─────────────────────────────────────────────────────

function RecCard({ industry, dir }: { industry: IndustryImpact; dir: 'up' | 'down' }) {
  const isDown = dir === 'down'
  const badgeColor = isDown ? 'var(--color-red)' : 'var(--color-green)'
  const badgeBg = isDown ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'
  const badgeBorder = isDown ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'
  const rationale = isDown
    ? `High portfolio weight (${industry.portfolio_weight.toFixed(2)}%) in a GPR-vulnerable sector. Current event increases downside risk.`
    : `Low portfolio weight (${industry.portfolio_weight.toFixed(2)}%) in a GPR-resilient sector. May provide cushion during geopolitical stress.`

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: badgeColor,
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
            padding: '2px 8px',
            letterSpacing: '0.05em',
          }}
        >
          {isDown ? 'TILT DOWN' : 'TILT UP'}
        </span>
        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
          β{industry.gpr_beta >= 0 ? '+' : ''}{industry.gpr_beta.toFixed(4)}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 6 }}>
        {industry.fed_industry_name}
      </div>
      <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
        {rationale}
      </p>
    </div>
  )
}

function RecommendationCards({ industries }: { industries: IndustryImpact[] }) {
  const { tiltDown, tiltUp } = computeTilts(industries)
  if (tiltDown.length === 0 && tiltUp.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-muted)' }}>lightbulb</span>
        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">Recommended Actions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tiltDown.map(ind => (
          <RecCard key={`down-${ind.fed_industry_id}`} industry={ind} dir="down" />
        ))}
        {tiltUp.map(ind => (
          <RecCard key={`up-${ind.fed_industry_id}`} industry={ind} dir="up" />
        ))}
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function IndustryImpactScreen() {
  const { industries, summary, loading, error } = useIndustryImpact()

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-red)', fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '0.875rem' }}>
        Error loading data: {error}
      </div>
    )
  }

  const resilient = [...industries]
    .filter(i => i.direction === 'positive')
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 5)

  const vulnerable = [...industries]
    .filter(i => i.direction === 'negative')
    .sort((a, b) => a.impact_score - b.impact_score)
    .slice(0, 5)

  return (
    <div
      className="no-scrollbar flex-1 overflow-y-auto bg-slate-950 px-6 py-5"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ExportButton industries={industries} />
      </div>

      {/* KPI cards */}
      {summary && <SummaryCards summary={summary} industries={industries} />}

      {/* Event findings */}
      {summary && industries.length > 0 && (
        <FindingsSummary industries={industries} summary={summary} />
      )}

      {/* Two-column: resilient + vulnerable */}
      {industries.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-5">
            <ImpactBarChart industries={resilient} direction="positive" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5">
            <ImpactBarChart industries={vulnerable} direction="negative" />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {industries.length > 0 && <RecommendationCards industries={industries} />}

      {/* Scatter plot */}
      <div className="bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-muted)' }}>bar_chart</span>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">Weight vs Sensitivity</span>
        </div>
        <div style={{ height: 400 }}>
          <ImpactScatterPlot industries={industries} />
        </div>
      </div>
    </div>
  )
}
