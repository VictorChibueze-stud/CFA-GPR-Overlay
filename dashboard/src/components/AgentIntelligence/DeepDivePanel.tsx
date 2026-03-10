'use client'

import { useMemo, useState } from 'react'
import level3Raw from '@/data/level3_deepdive.json'
import level1Raw from '@/data/level1_clusters.json'

// ─── Raw JSON shapes ───────────────────────────────────────────────────────────

type L3Holding = {
  company_name: string
  resolved_symbol: string
  weight_pct: number
  fed_industry_name: string
  exposure_verdict: string
  impact_direction: string
  confidence: number
  rationale: string
  linked_evidence_titles: string[]
}

type ClusterGroup = {
  clusterId: string
  channelLabel: string
  likely: L3Holding[]
  maybe: L3Holding[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getChannelLabel(clusterId: string, l1Map: Map<string, string>): string {
  const ch = l1Map.get(clusterId)
  if (ch) return ch.replace(/_/g, ' ').toUpperCase()
  const parts = clusterId.split('_')
  return parts.slice(2, 4).join(' ').toUpperCase()
}

function normalizeHolding(h: Record<string, unknown>): L3Holding {
  return {
    company_name: String(h.company_name ?? ''),
    resolved_symbol: String(h.resolved_symbol ?? ''),
    weight_pct: Number(h.weight_pct ?? 0),
    fed_industry_name: String(h.fed_industry_name ?? ''),
    exposure_verdict: String(h.exposure_verdict ?? 'unknown'),
    impact_direction: String(h.impact_direction ?? 'neutral'),
    confidence: Number(h.confidence ?? 0),
    rationale: String(h.rationale ?? ''),
    linked_evidence_titles: (h.linked_evidence_titles as string[]) ?? [],
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ColumnHeader({
  label,
  count,
  column,
}: {
  label: string
  count: number
  column?: 'likely' | 'maybe'
}) {
  const labelColor =
    column === 'likely' ? '#ef4444' :
    column === 'maybe'  ? '#f59e0b' :
    'var(--color-text)'

  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        style={{
          fontSize: '11px',
          fontWeight: 900,
          color: labelColor,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.15em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          padding: '2px 6px',
          backgroundColor: '#1e293b',
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </div>
  )
}

// ─── Mini confidence bar ───────────────────────────────────────────────────────

function MiniBar({ value, direction }: { value: number; direction: string }) {
  const pct = Math.round(value * 100)
  // Color by confidence value (same rules as WatchlistCards)
  const barColor =
    value >= 0.8 ? '#10b981' :
    value >= 0.6 ? '#60a5fa' :
    '#ef4444'

  // direction kept to satisfy type signature — used for dot color in HoldingRow
  void direction

  return (
    <div className="flex items-center gap-2" style={{ width: 96, flexShrink: 0 }}>
      <div className="flex-1 h-1 bg-slate-800" style={{ overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor }} />
      </div>
      <span
        style={{
          fontSize: '10px',
          color: '#94a3b8',
          minWidth: 28,
          textAlign: 'right' as const,
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ─── Evidence citation ─────────────────────────────────────────────────────────

function EvidenceCitation({ title, index }: { title: string; index: number }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: '11px',
        color: '#60a5fa',
        fontWeight: 700,
        lineHeight: 1.6,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.textDecoration = 'underline'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.textDecoration = 'none'
      }}
    >
      [{index + 1}] {title}
    </span>
  )
}

// ─── Holding row ───────────────────────────────────────────────────────────────

function HoldingRow({
  holding,
  rowKey,
  expandedRows,
  onToggle,
}: {
  holding: L3Holding
  rowKey: string
  expandedRows: Set<string>
  onToggle: (k: string) => void
}) {
  const isExpanded = expandedRows.has(rowKey)

  // Ticker pill color based on verdict + direction
  const tickerClasses =
    holding.exposure_verdict === 'likely_affected' && holding.impact_direction === 'positive'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : holding.exposure_verdict === 'likely_affected' && holding.impact_direction === 'negative'
      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'

  // Direction dot color — uses inline style with borderRadius: '50%' (required by test)
  const dotColor =
    holding.impact_direction === 'positive' ? '#10b981' :
    holding.impact_direction === 'negative' ? '#ef4444' :
    '#475569' // slate-600

  return (
    <>
      <div
        onClick={() => onToggle(rowKey)}
        className="flex items-center gap-3 border-b border-slate-800/50 cursor-pointer transition-colors"
        style={{
          padding: '10px 16px',
          backgroundColor: isExpanded ? 'rgba(15,23,42,0.8)' : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isExpanded)
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,41,59,0.3)'
        }}
        onMouseLeave={e => {
          if (!isExpanded)
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
        }}
      >
        {/* Ticker */}
        <span
          className={`font-black ${tickerClasses}`}
          style={{
            width: 64,
            flexShrink: 0,
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '1px 4px',
            display: 'inline-block',
          }}
        >
          {holding.resolved_symbol || '—'}
        </span>

        {/* Company name */}
        <span
          className="text-slate-300 font-bold uppercase"
          style={{
            flex: 1,
            fontSize: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {holding.company_name || '—'}
        </span>

        {/* Weight */}
        <span
          className="text-slate-500 font-bold"
          style={{ fontSize: '10px', width: 40, textAlign: 'right', flexShrink: 0 }}
        >
          {holding.weight_pct > 0 ? `${holding.weight_pct.toFixed(2)}%` : '—'}
        </span>

        {/* Confidence bar */}
        <MiniBar value={holding.confidence} direction={holding.impact_direction} />

        {/* Direction dot — borderRadius: '50%' in inline style (required by test) */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          style={{
            backgroundColor: '#020617',
            borderLeft: '2px solid #334155',
            padding: '16px 20px',
            margin: '0 16px 8px',
          }}
        >
          {holding.rationale && (
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              {holding.rationale}
            </p>
          )}
          {holding.linked_evidence_titles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {holding.linked_evidence_titles.map((title, i) => (
                <EvidenceCitation key={i} title={title} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── Section group ─────────────────────────────────────────────────────────────

function Section({
  group,
  column,
  openSections,
  onToggleSection,
  expandedRows,
  onToggleRow,
}: {
  group: ClusterGroup
  column: 'likely' | 'maybe'
  openSections: Set<string>
  onToggleSection: (k: string) => void
  expandedRows: Set<string>
  onToggleRow: (k: string) => void
}) {
  const sectionKey = `${column}:${group.clusterId}`
  const isOpen = openSections.has(sectionKey)
  const holdings = column === 'likely' ? group.likely : group.maybe
  if (holdings.length === 0) return null

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Section header */}
      <div
        onClick={() => onToggleSection(sectionKey)}
        className="bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer transition-colors"
        style={{ padding: '10px 16px' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,41,59,0.5)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = ''
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: '#60a5fa' }}
          >
            {isOpen ? 'expand_more' : 'chevron_right'}
          </span>
          <span
            style={{
              color: '#60a5fa',
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
            }}
          >
            {group.channelLabel}
          </span>
        </div>
        <span
          style={{
            padding: '2px 6px',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            fontSize: '10px',
            fontWeight: 700,
          }}
        >
          {holdings.length}
        </span>
      </div>

      {/* Holding rows */}
      {isOpen && (
        <div style={{ border: '1px solid #1e293b', borderTop: 'none' }}>
          {holdings.map((h, rowIdx) => {
            const rowKey = `${sectionKey}:${h.resolved_symbol}:${rowIdx}`
            return (
              <HoldingRow
                key={rowKey}
                holding={h}
                rowKey={rowKey}
                expandedRows={expandedRows}
                onToggle={onToggleRow}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DeepDivePanel() {
  const groups = useMemo<ClusterGroup[]>(() => {
    const l1Map = new Map<string, string>()
    for (const c of (level1Raw as { channels_by_cluster: Array<{ cluster_id: string; economic_channels?: Array<{ channel_type: string }> }> }).channels_by_cluster) {
      const ch = c.economic_channels?.[0]?.channel_type
      if (ch) l1Map.set(c.cluster_id, ch)
    }

    return (level3Raw as { clusters: Array<{ cluster_id: string; likely_affected_holdings?: Record<string, unknown>[]; maybe_affected_holdings?: Record<string, unknown>[] }> }).clusters.map(c => ({
      clusterId: c.cluster_id,
      channelLabel: getChannelLabel(c.cluster_id, l1Map),
      likely: (c.likely_affected_holdings ?? []).map(normalizeHolding),
      maybe: (c.maybe_affected_holdings ?? []).map(normalizeHolding),
    }))
  }, [])

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    if (groups.length === 0) return new Set()
    return new Set([`likely:${groups[0].clusterId}`])
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function toggleRow(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const totalLikely = groups.reduce((s, g) => s + g.likely.length, 0)
  const totalMaybe  = groups.reduce((s, g) => s + g.maybe.length, 0)

  return (
    <div className="p-6 flex gap-5" style={{ minHeight: 0 }}>
      {/* LIKELY column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <ColumnHeader label="Likely Affected" count={totalLikely} column="likely" />
        <div className="no-scrollbar" style={{ maxHeight: 600, overflowY: 'auto' }}>
          {totalLikely === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>None</span>
          ) : (
            groups.map(g => (
              <Section
                key={g.clusterId}
                group={g}
                column="likely"
                openSections={openSections}
                onToggleSection={toggleSection}
                expandedRows={expandedRows}
                onToggleRow={toggleRow}
              />
            ))
          )}
        </div>
      </div>

      {/* MAYBE column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <ColumnHeader label="Maybe Affected" count={totalMaybe} column="maybe" />
        <div className="no-scrollbar" style={{ maxHeight: 600, overflowY: 'auto' }}>
          {totalMaybe === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>None</span>
          ) : (
            groups.map(g => (
              <Section
                key={g.clusterId}
                group={g}
                column="maybe"
                openSections={openSections}
                onToggleSection={toggleSection}
                expandedRows={expandedRows}
                onToggleRow={toggleRow}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
