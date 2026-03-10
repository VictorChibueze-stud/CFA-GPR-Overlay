'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { useAgentIntelligence } from '@/hooks/useAgentIntelligence'
import ClusterAccordion from './ClusterAccordion'
import WatchlistCards from './WatchlistCards'
import DeepDivePanel from './DeepDivePanel'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[80, 80, 80].map((h, i) => (
        <div
          key={i}
          style={{ height: h, backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
        />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentIntelligenceScreen() {
  const { clusters, watchlist, deepdive, loading, error } = useAgentIntelligence()

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--color-red)' }}>
        Error: {error}
      </div>
    )
  }

  return (
    <>
      <style>{`
        /* ── Tab trigger ── */
        .gpr-tab-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
          margin-right: 32px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          color: #64748b;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .gpr-tab-trigger[data-state="active"] {
          border-bottom-color: #60a5fa;
          color: #f8fafc;
        }
        .gpr-tab-trigger:hover:not([data-state="active"]) {
          color: #cbd5e1;
        }

        /* ── Tab label text ── */
        .gpr-tab-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }
        .gpr-tab-trigger[data-state="active"] .gpr-tab-label {
          font-weight: 800;
        }

        /* ── Count pill ── */
        .gpr-tab-pill {
          padding: 1px 6px;
          background-color: rgba(30,41,59,0.5);
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }
        .gpr-tab-trigger[data-state="active"] .gpr-tab-pill {
          background-color: #1e293b;
          color: #cbd5e1;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* ── Tabs ── */}
        <Tabs.Root defaultValue="clusters">

          {/* Tabs list */}
          <Tabs.List
            className="flex border-b border-slate-800 px-6"
            style={{ backgroundColor: 'rgba(2,6,23,0.5)' }}
          >
            <Tabs.Trigger value="clusters" className="gpr-tab-trigger">
              <span className="gpr-tab-label">Threat Clusters</span>
              <span className="gpr-tab-pill">{clusters.length}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="watchlist" className="gpr-tab-trigger">
              <span className="gpr-tab-label">Watchlist</span>
              <span className="gpr-tab-pill">{watchlist.length}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="deepdive" className="gpr-tab-trigger">
              <span className="gpr-tab-label">Deep Dive</span>
              <span className="gpr-tab-pill">{deepdive.likely.length + deepdive.maybe.length}</span>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab content areas */}
          <Tabs.Content
            value="clusters"
            className="no-scrollbar"
            style={{ backgroundColor: '#020617', overflowY: 'auto' }}
          >
            <div className="p-6 space-y-3">
              <ClusterAccordion clusters={clusters} />
            </div>
          </Tabs.Content>

          <Tabs.Content
            value="watchlist"
            className="no-scrollbar"
            style={{ backgroundColor: '#020617', overflowY: 'auto' }}
          >
            <WatchlistCards holdings={watchlist} />
          </Tabs.Content>

          <Tabs.Content
            value="deepdive"
            className="no-scrollbar"
            style={{ backgroundColor: '#020617', overflowY: 'auto' }}
          >
            <DeepDivePanel />
          </Tabs.Content>

        </Tabs.Root>
      </div>
    </>
  )
}
