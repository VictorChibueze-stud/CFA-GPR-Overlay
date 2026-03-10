'use client'

import * as Accordion from '@radix-ui/react-accordion'
import type { ThreatCluster } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTag(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const CLUSTER_NAME_OVERRIDES: Record<string, string> = {
  'cluster_003_unscrutiny_unscr': 'UN Security Council Scrutiny',
  'cluster_003_unscr': 'UN Security Council Scrutiny',
}

/** Strip "cluster_NNN_" prefix, replace underscores, title case */
function clusterDisplayName(clusterId: string): string {
  const override = CLUSTER_NAME_OVERRIDES[clusterId]
  if (override) return override
  return clusterId
    .split('_')
    .filter(part => !/^(cluster|\d+)$/.test(part))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

// ─── Category badge config ────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  escalation_of_war: {
    label: 'Escalation',
    bg: 'rgba(239,68,68,0.1)',
    text: '#ef4444',
    border: 'rgba(239,68,68,0.2)',
  },
  terror_threats: {
    label: 'Terror',
    bg: 'rgba(245,158,11,0.1)',
    text: '#f59e0b',
    border: 'rgba(245,158,11,0.2)',
  },
  peace_threats: {
    label: 'Peace Talks',
    bg: 'rgba(16,185,129,0.1)',
    text: '#10b981',
    border: 'rgba(16,185,129,0.2)',
  },
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_BADGE[category]
  const label = cfg?.label ?? formatTag(category)
  const bg = cfg?.bg ?? 'rgba(139,148,158,0.1)'
  const text = cfg?.text ?? 'var(--color-muted)'
  const border = cfg?.border ?? 'rgba(139,148,158,0.2)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '-0.02em',
        textTransform: 'uppercase' as const,
        color: text,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

// ─── Actor flag map ───────────────────────────────────────────────────────────

const FLAG_MAP: Record<string, string> = {
  'United States': '🇺🇸', 'Israel': '🇮🇱', 'Iran': '🇮🇷', 'Russia': '🇷🇺',
  'Ukraine': '🇺🇦', 'China': '🇨🇳', 'India': '🇮🇳', 'Pakistan': '🇵🇰',
  'North Korea': '🇰🇵', 'Saudi Arabia': '🇸🇦', 'Turkey': '🇹🇷',
  'UK': '🇬🇧', 'France': '🇫🇷', 'Germany': '🇩🇪',
}

function actorFlag(name: string): string {
  for (const [key, flag] of Object.entries(FLAG_MAP)) {
    if (name.includes(key)) return flag
  }
  return '🏛'
}

// ─── Timeline bar ─────────────────────────────────────────────────────────────

function TimelineBar({ timeRange }: { timeRange: string }) {
  const separators = [' — ', ' – ', ' - ', '—', '–']
  let start = ''
  let end = ''
  for (const sep of separators) {
    if (timeRange.includes(sep)) {
      const parts = timeRange.split(sep).map(s => s.trim())
      start = parts[0] ?? ''
      end = parts[1] ?? ''
      break
    }
  }

  if (!start || !end) {
    return (
      <div
        className="px-6 py-3 border-b border-slate-800"
        style={{ fontSize: '11px', color: 'var(--color-muted)' }}
      >
        {timeRange}
      </div>
    )
  }

  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  const days = !isNaN(startMs) && !isNaN(endMs)
    ? Math.round((endMs - startMs) / 86400000)
    : null

  return (
    <div className="px-6 py-3 flex items-center gap-4 border-b border-slate-800">
      <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Timeline</span>
      <div className="flex-1 flex items-center gap-3">
        <span className="text-slate-400 text-[10px] font-bold">{start}</span>
        <div className="flex-1 relative" style={{ height: 1, backgroundColor: '#1e293b' }}>
          {days !== null && (
            <div className="absolute inset-x-0 flex justify-center" style={{ top: -12 }}>
              <span
                className="text-slate-500 text-[11px] font-bold px-2 tracking-tighter"
                style={{ backgroundColor: '#0f172a' }}
              >
                {days} {days === 1 ? 'day' : 'days'} duration
              </span>
            </div>
          )}
        </div>
        <span className="text-slate-400 text-[10px] font-bold">{end}</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  clusters: ThreatCluster[]
}

export default function ClusterAccordion({ clusters }: Props) {
  return (
    <>
      <style>{`
        /* Expand/collapse icon swap */
        .gpr-show-open { display: none; }
        .gpr-cluster-item[data-state="open"] .gpr-show-open  { display: inline; }
        .gpr-cluster-item[data-state="open"] .gpr-show-closed { display: none; }

        /* Blue left border on open item */
        .gpr-cluster-item[data-state="open"] { border-left: 2px solid #60a5fa !important; }

        /* Trigger hover */
        .gpr-cluster-trigger { transition: background-color 150ms; width: 100%; }
        .gpr-cluster-trigger:hover { background-color: rgba(30,41,59,0.5); }

        /* Bottom border on trigger — visible only when open */
        .gpr-cluster-trigger { border-bottom: 1px solid transparent; }
        .gpr-cluster-item[data-state="open"] .gpr-cluster-trigger {
          border-bottom: 1px solid #1e293b;
        }
      `}</style>

      <Accordion.Root
        type="single"
        collapsible
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {clusters.map(cluster => {
          const displayName = clusterDisplayName(cluster.cluster_id)
          const industrySet = new Set(
            cluster.economic_channels.flatMap(ch =>
              ch.linked_industries.map(li => li.industry_name)
            )
          )
          const evidenceCount = cluster.economic_channels.filter(ch => ch.evidence_found).length

          return (
            <Accordion.Item
              key={cluster.cluster_id}
              value={cluster.cluster_id}
              className="gpr-cluster-item"
              style={{
                border: '1px solid #1e293b',
                backgroundColor: '#0f172a',
                overflow: 'hidden',
              }}
            >
              {/* ── Trigger (header row) ── */}
              <Accordion.Trigger
                className="gpr-cluster-trigger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span
                    style={{
                      color: '#f8fafc',
                      fontSize: '14px',
                      fontWeight: 700,
                      letterSpacing: '-0.025em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {displayName}
                  </span>
                  <CategoryBadge category={cluster.threat_category} />
                </div>

                <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: 20, flexShrink: 0 }}>
                  <span className="gpr-show-closed">add</span>
                  <span className="gpr-show-open">remove</span>
                </span>
              </Accordion.Trigger>

              {/* ── Content ── */}
              <Accordion.Content style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Stats row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    borderBottom: '1px solid #1e293b',
                  }}
                >
                  <div
                    style={{
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      borderRight: '1px solid #1e293b',
                    }}
                  >
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        marginBottom: 4,
                      }}
                    >
                      Economic Channels
                    </span>
                    <span className="stat-value" style={{ color: '#f8fafc', fontSize: '2.25rem' }}>
                      {cluster.economic_channels.length}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      borderRight: '1px solid #1e293b',
                    }}
                  >
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        marginBottom: 4,
                      }}
                    >
                      Industries Affected
                    </span>
                    <span className="stat-value" style={{ color: '#f8fafc', fontSize: '2.25rem' }}>
                      {industrySet.size}
                    </span>
                  </div>

                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        marginBottom: 4,
                      }}
                    >
                      Evidence Found
                    </span>
                    <span className="stat-value" style={{ color: '#f8fafc', fontSize: '2.25rem' }}>
                      {evidenceCount}
                    </span>
                  </div>
                </div>

                {/* Actors row */}
                {cluster.primary_actors.length > 0 && (
                  <div
                    style={{
                      padding: '16px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 24,
                      borderBottom: '1px solid #1e293b',
                    }}
                  >
                    <span
                      style={{
                        color: '#64748b',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.2em',
                        flexShrink: 0,
                      }}
                    >
                      Actors
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      {cluster.primary_actors.map(actor => (
                        <span
                          key={actor}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#cbd5e1',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {actorFlag(actor)} {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline row */}
                {cluster.time_range && (
                  <TimelineBar timeRange={cluster.time_range} />
                )}

                {/* Channels content */}
                {cluster.economic_channels.length > 0 && (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {cluster.economic_channels.map(ch => (
                      <div key={ch.channel_id}>
                        {/* Channel header: pill + summary */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              backgroundColor: 'rgba(96,165,250,0.1)',
                              border: '1px solid rgba(96,165,250,0.3)',
                              color: '#60a5fa',
                              fontSize: '10px',
                              fontWeight: 900,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.15em',
                              flexShrink: 0,
                            }}
                          >
                            {formatTag(ch.channel_type)}
                          </span>
                          {ch.description && (
                            <p
                              style={{
                                margin: 0,
                                color: '#94a3b8',
                                fontSize: '14px',
                                fontWeight: 500,
                                fontStyle: 'italic',
                              }}
                            >
                              {ch.description}
                            </p>
                          )}
                        </div>

                        {/* Industry items */}
                        {ch.linked_industries.length > 0 && (
                          <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {ch.linked_industries.map((li, idx) => {
                              const borderStyle =
                                li.role === 'vulnerable'
                                  ? '2px solid #ef4444'
                                  : li.role === 'resilient'
                                  ? '2px solid #10b981'
                                  : '1px solid #334155'

                              return (
                                <div
                                  key={li.industry_name}
                                  style={{
                                    borderLeft: borderStyle,
                                    paddingLeft: 16,
                                    paddingTop: 4,
                                    paddingBottom: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: '#64748b',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {String(idx + 1).padStart(2, '0')}.
                                    </span>
                                    <h4
                                      style={{
                                        margin: 0,
                                        color: '#f8fafc',
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '-0.025em',
                                      }}
                                    >
                                      {li.industry_name}
                                    </h4>
                                  </div>
                                  {li.rationale && (
                                    <p
                                      style={{
                                        margin: 0,
                                        color: '#94a3b8',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        lineHeight: 1.6,
                                        maxWidth: '64ch',
                                      }}
                                    >
                                      {li.rationale}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </Accordion.Content>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>
    </>
  )
}
