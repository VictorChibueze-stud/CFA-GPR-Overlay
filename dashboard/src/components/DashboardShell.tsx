'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import GeospatialGlobe from './shared/GeospatialGlobe'
import { fetchSyncStatus } from '@/lib/apiClient'

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/event-monitor',      label: 'Event Monitor',        icon: 'monitor_heart',          id: 'nav-event-monitor'      },
  { href: '/industry-impact',    label: 'Industry Impact',      icon: 'factory',                id: 'nav-industry-impact'    },
  { href: '/holdings',           label: 'Holdings',             icon: 'account_balance_wallet', id: 'nav-holdings'           },
  { href: '/agent-intelligence', label: 'Agentic Intelligence', icon: 'psychology',             id: 'nav-agent-intelligence' },
]

const PAGE_TITLES: Record<string, string> = {
  '/event-monitor':      'Event Monitor',
  '/industry-impact':    'Industry Impact',
  '/holdings':           'Holdings',
  '/agent-intelligence': 'Agentic Intelligence',
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

const GLOSSARY_TERMS = [
  {
    term: 'GPR INDEX',
    def: 'The Geopolitical Risk index by Caldara & Iacoviello (2022). Measures adverse geopolitical events via automated text-search of 10 major newspapers. Indexed to 100 = average 1985–2019.',
  },
  {
    term: 'GPRD (Daily GPR)',
    def: 'The daily version of the GPR index. More volatile than monthly; captures intraday news cycles.',
  },
  {
    term: 'MA7 / MA30',
    def: '7-day and 30-day moving averages of GPRD. MA30 smooths noise; MA7 shows short-term momentum.',
  },
  {
    term: 'SPIKE (Extreme / Elevated)',
    def: 'Extreme Spike: current GPRD is at or above the 99.5th percentile of all historical values. Elevated Spike: at or above the 99th percentile.',
  },
  {
    term: 'GPR BETA',
    def: "Sensitivity of an industry's returns to a unit change in the GPR index. Positive beta = industry benefits from geopolitical stress. Negative beta = industry is hurt.",
  },
  {
    term: 'IMPACT SCORE',
    def: 'impact_score = severity × (portfolio_weight / 100) × gpr_beta. Negative = portfolio is net hurt by the event in this industry.',
  },
  {
    term: 'SEVERITY SCORE',
    def: 'Normalised 0–1. Derived from the percentile of the spike. 1.0 = highest spike in history.',
  },
  {
    term: 'VULNERABILITY BASELINE',
    def: "The portfolio's total GPR impact at maximum severity (severity = 1.0). Represents worst-case single-event exposure.",
  },
  {
    term: 'FED INDUSTRY IDs',
    def: "Industry classification based on the Federal Reserve's industry beta mapping. Used to link portfolio holdings to GPR sensitivity estimates.",
  },
  {
    term: 'ESG CONSTRAINT',
    def: 'Advisory recommendations never suggest upward tilt into coal, petroleum, oil & gas, defense, or weapons industries, regardless of positive GPR beta.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pageTitle = PAGE_TITLES[pathname] ?? 'GPR Intelligence'

  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [rightOpen, setRightOpen] = useState(true)
  const [syncDate, setSyncDate] = useState<string | null>(null)

  useEffect(() => {
    document.body.dataset.printDate = new Date().toLocaleDateString()
  }, [])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return
    fetchSyncStatus()
      .then(s => {
        if (s.last_date) setSyncDate(s.last_date)
      })
      .catch(() => {
        // silent fail — static fallback below
      })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('gpr-tour-seen')) return
    import('@/lib/tour').then(({ initTour }) => {
      const d = initTour()
      d.drive()
      localStorage.setItem('gpr-tour-seen', '1')
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleThemeToggle() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  function retriggerTour() {
    import('@/lib/tour').then(({ initTour }) => {
      const d = initTour()
      d.drive()
    })
  }

  return (
    <div className="flex h-screen w-full" style={{ overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col bg-slate-950 border-r border-slate-800"
        style={{ position: 'fixed', top: 0, left: 0, width: 256, height: '100vh', zIndex: 40 }}
      >
        {/* Logo block */}
        <div className="p-6">
          <div className="flex flex-col mb-10">
            <h1 className="text-amber-500 text-xl font-black tracking-tighter">GPR</h1>
            <span className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-extrabold block">
              INTELLIGENCE
            </span>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon, id }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  id={id}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: active ? 800 : 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: active ? '#60a5fa' : '#94a3b8',
                    borderLeft: active ? '2px solid #60a5fa' : '2px solid transparent',
                    backgroundColor: active ? 'rgba(96,165,250,0.05)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = '#f8fafc'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          className="mt-auto p-6 border-t border-slate-800/50"
          style={{ borderTopColor: 'rgba(30,41,59,0.5)' }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-slate-300 text-xs font-bold">iShares LCTD</p>
            <p className="text-slate-500 text-[10px] font-medium tracking-tight">2025-06-23</p>
            <p className="text-slate-500 text-[10px] font-medium uppercase mt-1 tracking-tight">
              v2.1 Build 9942
            </p>
          </div>

          {/* Pipeline methodology modal */}
          <div style={{ marginTop: 12 }}>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    color: 'var(--color-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 6,
                    textDecoration: 'underline',
                    textAlign: 'left',
                  }}
                >
                  ⓘ Pipeline
                </button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 100,
                  }}
                />
                <Dialog.Content
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    maxWidth: 680,
                    width: '90vw',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    backgroundColor: 'var(--color-panel)',
                    border: '1px solid var(--color-border)',
                    padding: '2rem',
                    zIndex: 101,
                  }}
                >
                  <Dialog.Title
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--color-amber)',
                      marginBottom: 4,
                    }}
                  >
                    GPR Intelligence Pipeline
                  </Dialog.Title>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-muted)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    CFA Institute Enterprising Investor — Co-authored publication
                  </p>

                  {[
                    {
                      title: 'THE RESEARCH',
                      content:
                        'This dashboard surfaces the technical implementation underlying "Geopolitical Risk and Portfolio Oversight", published on the CFA Institute Enterprising Investor. The full technical implementation is original work: spike detection engine, Fed industry beta mapping, portfolio impact scoring, and a 3-agent AI narrative layer.',
                    },
                  ].map(s => (
                    <Section key={s.title} title={s.title} content={s.content} />
                  ))}

                  <SectionHeading title="PIPELINE ARCHITECTURE" />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {[
                      'GPR CSV',
                      'Spike Detection',
                      'Portfolio Overlay',
                      'Impact Scoring',
                      'AI Narrative Layer',
                      'This Dashboard',
                    ].map((box, i, arr) => (
                      <div key={box} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            border: '1px solid var(--color-border)',
                            padding: '4px 12px',
                            fontSize: '0.625rem',
                            color: 'var(--color-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {box}
                        </div>
                        {i < arr.length - 1 && (
                          <span style={{ color: 'var(--color-amber)', fontSize: '0.875rem' }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <SectionHeading title="SPIKE DETECTION ENGINE" />
                  <ul
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      marginBottom: '1.5rem',
                      paddingLeft: '1.2rem',
                      lineHeight: 1.7,
                    }}
                  >
                    <li>Quantile spike: full-history percentile ≥ 99th → elevated; ≥ 99.5th → extreme</li>
                    <li>Short-term spike: z-score &gt; 2.0 on 30-day rolling window + local max check</li>
                    <li>Event window: [peak − 7d, peak + 2d]</li>
                  </ul>

                  <SectionHeading title="IMPACT FORMULA" />
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      padding: '12px',
                      fontSize: '0.75rem',
                      color: 'var(--color-text)',
                      lineHeight: 1.7,
                      marginBottom: '1.5rem',
                      whiteSpace: 'pre',
                    }}
                  >
                    {`impact_score = severity_score × (portfolio_weight / 100) × gpr_beta\nnet_impact > 0  →  net resilient\nnet_impact < 0  →  net vulnerable`}
                  </div>

                  <SectionHeading title="3-AGENT AI LAYER" />
                  <ul
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      marginBottom: '1.5rem',
                      paddingLeft: '1.2rem',
                      lineHeight: 1.7,
                    }}
                  >
                    <li>Agent 1: Threat cluster identification — maps GPR spike to geopolitical event clusters with region, actors, time range</li>
                    <li>Agent 2: Portfolio analysis — maps clusters to economic channels and scores each holding&apos;s exposure</li>
                    <li>Agent 3: Deep dive — per-holding verdict with confidence score, rationale, and linked evidence</li>
                  </ul>

                  <SectionHeading title="TECH STACK" />
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      lineHeight: 1.7,
                      marginBottom: '2rem',
                    }}
                  >
                    Next.js 16 · TypeScript · Tailwind CSS · Recharts · Python · Pydantic v2 · FastAPI (stub) · Docker · GitHub Actions
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Dialog.Close asChild>
                      <button
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          background: 'none',
                          border: '1px solid var(--color-border)',
                          padding: '4px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        Close
                      </button>
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            {/* Tour trigger */}
            <button
              onClick={retriggerTour}
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
                textAlign: 'left',
              }}
            >
              Tour
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTENT AREA (between sidebar and right panel) ───────────────── */}
      <div style={{ marginLeft: 256, marginRight: rightOpen ? 320 : 40, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-right 200ms ease-in-out' }}>

        {/* TOP BAR */}
        <header
          data-topbar="true"
          className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950"
          style={{ position: 'fixed', top: 0, left: 256, right: rightOpen ? 320 : 40, height: 56, zIndex: 30, transition: 'right 200ms ease-in-out' }}
        >
          {/* Left: fund name + event badge */}
          <div className="flex items-center gap-4">
            <h2
              className="text-sm font-extrabold uppercase tracking-wide"
              style={{ color: '#f8fafc' }}
            >
              iShares LCTD
            </h2>
            <div
              className="flex items-center gap-2 px-2 border rounded-sm"
              style={{
                paddingTop: 2,
                paddingBottom: 2,
                backgroundColor: 'rgba(244,63,94,0.1)',
                borderColor: 'rgba(244,63,94,0.2)',
              }}
            >
              <span
                className="rounded-full animate-pulse"
                style={{ width: 6, height: 6, backgroundColor: '#f43f5e', display: 'inline-block' }}
              />
              <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">
                Extreme Spike
              </span>
            </div>
          </div>

          {/* Right: timestamp + controls */}
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-tight">
              LAST UPDATE ·{' '}
              {syncDate
                ? new Date(syncDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
            <span
              className="material-symbols-outlined text-slate-400 cursor-pointer"
              style={{ fontSize: 20 }}
            >
              settings
            </span>
            <button
              aria-label="Toggle theme"
              onClick={handleThemeToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {theme === 'dark' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <button
              id="glossary-btn"
              onClick={() => setGlossaryOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                fontSize: '0.75rem',
              }}
            >
              ?
            </button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 min-w-0 overflow-hidden flex flex-col"
          style={{ paddingTop: 56, backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1280px] w-full mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col border-l border-slate-800 bg-slate-950 transition-all duration-200 ease-in-out overflow-hidden"
        style={{ position: 'fixed', top: 0, right: 0, width: rightOpen ? 320 : 40, height: '100vh', zIndex: 20 }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setRightOpen(r => !r)}
          className="flex items-center justify-center w-full h-10 flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors border-b border-slate-800"
          style={{ background: 'none', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {rightOpen ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        {rightOpen && (
          <>
            {/* Section 1 — Geospatial Intelligence */}
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                Geospatial Intelligence
              </h3>
              <div className="w-full h-[200px] overflow-hidden">
                <GeospatialGlobe />
              </div>
            </div>

            {/* Section 2 + 3 — Agents + Signal Feed */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

              {/* Active Agents */}
              <div>
                <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  Active Agents
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between" style={{ fontSize: 10, fontWeight: 700 }}>
                    <span className="text-slate-300">Pipeline Monitor</span>
                    <span className="text-emerald-500 font-black uppercase">Processing</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900">
                    <div className="h-full" style={{ width: '75%', backgroundColor: 'rgba(96,165,250,0.4)' }} />
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: 10, fontWeight: 700 }}>
                    <span className="text-slate-300">Signal Classifier</span>
                    <span className="text-slate-500 uppercase">Idle</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900">
                    <div className="h-full bg-slate-700" style={{ width: '25%' }} />
                  </div>
                </div>
              </div>

              {/* Live Signal Feed */}
              <div>
                <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  Live Signal Feed
                </h4>
                <div className="space-y-3">
                  <div className="border-l border-slate-800 pl-3">
                    <p className="text-slate-500 text-[10px] font-bold mb-1">08:41:02</p>
                    <p className="text-slate-300 text-[11px] leading-tight font-extrabold uppercase">
                      EMBARGO PROTOCOLS UPDATED FOR REGION VII
                    </p>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <p className="text-slate-500 text-[10px] font-bold mb-1">08:39:44</p>
                    <p className="text-slate-300 text-[11px] leading-tight font-extrabold uppercase">
                      MACHINERY EXPORT VOLATILITY SPIKE DETECTED
                    </p>
                  </div>
                  <div className="border-l border-rose-500 pl-3">
                    <p className="text-rose-500 text-[10px] font-black mb-1">08:35:12</p>
                    <p className="text-white text-[11px] leading-tight font-black uppercase">
                      CRITICAL: GEOPOLITICAL ESCALATION DETECTED
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </aside>

      {/* ── GLOSSARY SLIDE-OUT (overlays right panel at z-50) ────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: 320,
          backgroundColor: 'var(--color-panel)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 50,
          transform: glossaryOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            GLOSSARY
          </span>
          <button
            onClick={() => setGlossaryOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {GLOSSARY_TERMS.map((entry, i) => (
            <div
              key={entry.term}
              style={{
                borderBottom: i < GLOSSARY_TERMS.length - 1 ? '1px solid var(--color-border)' : 'none',
                paddingBottom: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--color-blue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                {entry.term}
              </div>
              <p
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-muted)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {entry.def}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Modal helper components ─────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: '0.625rem',
        color: 'var(--color-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 8,
        fontWeight: 600,
      }}
    >
      {title}
    </div>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <SectionHeading title={title} />
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-muted)',
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {content}
      </p>
    </div>
  )
}
