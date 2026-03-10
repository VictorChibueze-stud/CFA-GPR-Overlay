'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Line,
  ReferenceLine,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from 'recharts'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { GPRDataPoint } from '@/types'

type ZoomDomain = { start: number; end: number } | null

const PRESETS = ['1Y', '3Y', '5Y', '2020+', 'All'] as const

function pctVal(sorted: number[], p: number): number {
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)]
}

interface Props {
  data: GPRDataPoint[]
}

export default function GPRChart({ data }: Props) {
  const [showMA7, setShowMA7] = useState(true)
  const [showMA30, setShowMA30] = useState(true)
  const [showActs, setShowActs] = useState(false)
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain>(() => {
    if (data.length === 0) return null
    const lastIdx = data.length - 1
    const lastDate = data[lastIdx].date
    const startDate = `${parseInt(lastDate.slice(0, 4)) - 5}${lastDate.slice(4)}`
    const startIdx = data.findIndex(d => d.date >= startDate)
    return { start: Math.max(0, startIdx), end: lastIdx }
  })
  const [activePreset, setActivePreset] = useState<string>('5Y')

  const { p80, p95, p99 } = useMemo(() => {
    if (!data.length) return { p80: 0, p95: 0, p99: 0 }
    const sorted = [...data.map(d => d.gprd)].sort((a, b) => a - b)
    return {
      p80: pctVal(sorted, 0.80),
      p95: pctVal(sorted, 0.95),
      p99: pctVal(sorted, 0.99),
    }
  }, [data])

  const dataMap = useMemo(
    () => new Map(data.map(d => [d.date, d])),
    [data],
  )

  const spikes = useMemo(() => data.filter(d => d.is_spike), [data])

  function applyPreset(preset: string) {
    setActivePreset(preset)
    if (!data.length) return
    const lastIdx = data.length - 1
    if (preset === 'All') { setZoomDomain(null); return }
    const lastDate = data[lastIdx].date
    const lastYear = parseInt(lastDate.slice(0, 4))
    let startDate: string
    if (preset === '1Y')        startDate = `${lastYear - 1}${lastDate.slice(4)}`
    else if (preset === '3Y')   startDate = `${lastYear - 3}${lastDate.slice(4)}`
    else if (preset === '5Y')   startDate = `${lastYear - 5}${lastDate.slice(4)}`
    else                        startDate = '2020-01-01'
    const startIdx = data.findIndex(d => d.date >= startDate)
    setZoomDomain({ start: Math.max(0, startIdx), end: lastIdx })
  }

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--font-family-sans), sans-serif',
    fontSize: '0.75rem',
    padding: '6px 12px',
    cursor: 'pointer',
    background: 'transparent',
    lineHeight: 1.5,
  }

  const PRESET_TIPS: Record<string, string> = {
    '1Y': 'Show last 12 months', '3Y': 'Show last 3 years',
    '5Y': 'Show last 5 years', '2020+': 'Show from January 2020 onward',
    'All': 'Show full history',
  }
  const TOGGLE_TIPS: Record<string, string> = {
    'MA7':  '7-day moving average — short-term momentum',
    'MA30': '30-day moving average — smooths daily noise',
    'ACTS': 'GPR Acts — counts actual adverse events vs threats only',
  }

  const tipStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-panel)',
    border: '1px solid var(--color-border)',
    padding: '5px 9px',
    fontFamily: 'var(--font-family-mono), monospace',
    fontSize: '0.625rem',
    color: 'var(--color-muted)',
    maxWidth: 220,
    lineHeight: 1.5,
    zIndex: 999,
  }

  return (
    <div className="min-w-0 w-full">
      <style>{`
        .gpr-preset-btn { transition: border-color 150ms, color 150ms, background-color 150ms; }
        .gpr-preset-btn:not([data-active="true"]):hover {
          border-color: #475569 !important;
          color: var(--color-text) !important;
        }
      `}</style>

      {/* Controls row */}
      <RadixTooltip.Provider delayDuration={400}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>

          {/* Preset buttons */}
          {PRESETS.map(p => {
            const isActive = activePreset === p
            return (
              <RadixTooltip.Root key={p}>
                <RadixTooltip.Trigger asChild>
                  <button
                    className="gpr-preset-btn"
                    data-active={isActive ? 'true' : undefined}
                    onClick={() => applyPreset(p)}
                    style={{
                      ...btnBase,
                      border: `1px solid ${isActive ? 'rgba(96,165,250,0.4)' : '#1e293b'}`,
                      color: isActive ? '#60a5fa' : '#64748b',
                      backgroundColor: isActive ? 'rgba(96,165,250,0.1)' : 'transparent',
                    }}
                  >
                    {p}
                  </button>
                </RadixTooltip.Trigger>
                <RadixTooltip.Portal>
                  <RadixTooltip.Content sideOffset={4} style={tipStyle}>
                    {PRESET_TIPS[p]}
                    <RadixTooltip.Arrow style={{ fill: 'var(--color-border)' }} />
                  </RadixTooltip.Content>
                </RadixTooltip.Portal>
              </RadixTooltip.Root>
            )
          })}

          <div style={{ flex: 1 }} />

          {/* Toggle buttons */}
          {(([
            ['MA7',  showMA7,  () => setShowMA7(v  => !v)],
            ['MA30', showMA30, () => setShowMA30(v => !v)],
            ['ACTS', showActs, () => setShowActs(v => !v)],
          ] as [string, boolean, () => void][]).map(([label, active, toggle]) => (
            <RadixTooltip.Root key={label}>
              <RadixTooltip.Trigger asChild>
                <button
                  className="gpr-preset-btn"
                  data-active={active ? 'true' : undefined}
                  onClick={toggle}
                  style={{
                    ...btnBase,
                    border: `1px solid ${active ? 'rgba(96,165,250,0.4)' : '#1e293b'}`,
                    color: active ? '#60a5fa' : '#64748b',
                    backgroundColor: active ? 'rgba(96,165,250,0.1)' : 'transparent',
                  }}
                >
                  {label}
                </button>
              </RadixTooltip.Trigger>
              <RadixTooltip.Portal>
                <RadixTooltip.Content sideOffset={4} style={tipStyle}>
                  {TOGGLE_TIPS[label]}
                  <RadixTooltip.Arrow style={{ fill: 'var(--color-border)' }} />
                </RadixTooltip.Content>
              </RadixTooltip.Portal>
            </RadixTooltip.Root>
          )))}
        </div>
      </RadixTooltip.Provider>

      {/* Main chart */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 4, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            interval={Math.floor(data.length / 40)}
            angle={-30}
            textAnchor="end"
            tick={{ fill: 'var(--color-muted)', fontSize: 10, fontFamily: 'var(--font-family-sans)' }}
            tickFormatter={(v: unknown) => String(v).slice(0, 4)}
          />

          <YAxis
            tick={{ fill: 'var(--color-muted)', fontSize: 10, fontFamily: 'var(--font-family-sans)' }}
            width={50}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const point = dataMap.get(label as string)
              if (!point) return null
              const get = (name: string) =>
                payload.find(p => p.name === name)?.value as number | undefined
              return (
                <div
                  style={{
                    backgroundColor: 'var(--color-panel)',
                    border: '1px solid var(--color-border)',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-family-mono), monospace',
                    fontSize: '0.6875rem',
                    color: 'var(--color-text)',
                    minWidth: 160,
                  }}
                >
                  <div style={{ color: 'var(--color-muted)', marginBottom: 6 }}>{point.date}</div>
                  {get('GPR Index') !== undefined && (
                    <div>GPR: <span style={{ color: 'var(--color-text)' }}>{get('GPR Index')!.toFixed(1)}</span></div>
                  )}
                  {get('MA7') !== undefined && showMA7 && (
                    <div>MA7: <span style={{ color: '#3b82f6' }}>{get('MA7')!.toFixed(1)}</span></div>
                  )}
                  {get('MA30') !== undefined && showMA30 && (
                    <div>MA30: <span style={{ color: '#60a5fa' }}>{get('MA30')!.toFixed(1)}</span></div>
                  )}
                  <div>
                    Pctl:{' '}
                    <span style={{ color: 'var(--color-muted)' }}>
                      {(point.percentile * 100).toFixed(1)}%
                    </span>
                  </div>
                  {point.is_spike && (
                    <div
                      style={{
                        marginTop: 4,
                        display: 'inline-block',
                        color: 'var(--color-amber)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        padding: '1px 6px',
                        fontSize: '0.5625rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      SPIKE
                    </div>
                  )}
                </div>
              )
            }}
          />

          <ReferenceLine y={p80} stroke="var(--color-muted)" strokeDasharray="4 4"
            label={{ value: 'P80', position: 'insideTopRight', fill: 'var(--color-muted)', fontSize: 9 }} />
          <ReferenceLine y={p95} stroke="var(--color-amber)" strokeDasharray="4 4"
            label={{ value: 'P95', position: 'insideTopRight', fill: 'var(--color-amber)', fontSize: 9 }} />
          <ReferenceLine y={p99} stroke="var(--color-red)" strokeDasharray="4 4"
            label={{ value: 'P99', position: 'insideTopRight', fill: 'var(--color-red)', fontSize: 9 }} />

          {spikes.map(pt => (
            <ReferenceLine key={pt.date} x={pt.date} stroke="var(--color-amber)" strokeOpacity={0.4} strokeWidth={1} />
          ))}

          <Line type="monotone" dataKey="gprd" stroke="var(--color-text)" strokeWidth={1.5}
            dot={false} name="GPR Index" isAnimationActive={false} />
          <Line type="monotone" dataKey="gprd_ma7" stroke="#3b82f6" strokeWidth={1}
            dot={false} strokeDasharray="4 4" hide={!showMA7} name="MA7" isAnimationActive={false} />
          <Line type="monotone" dataKey="gprd_ma30" stroke="#60a5fa" strokeWidth={1}
            dot={false} strokeDasharray="6 2" hide={!showMA30} name="MA30" isAnimationActive={false} />
          <Line type="monotone" dataKey="gprd_act" stroke="var(--color-muted)" strokeWidth={1}
            dot={false} hide={!showActs} name="GPR Acts" isAnimationActive={false} />

          <Brush
            dataKey="date"
            height={60}
            stroke="var(--color-border)"
            fill="var(--color-panel)"
            travellerWidth={8}
            startIndex={zoomDomain?.start ?? 0}
            endIndex={zoomDomain?.end ?? Math.max(0, data.length - 1)}
            onChange={(brushData: { startIndex?: number; endIndex?: number }) => {
              if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                setZoomDomain({ start: brushData.startIndex, end: brushData.endIndex })
                setActivePreset('')
              }
            }}
            tickFormatter={(v: unknown) => String(v).slice(0, 4)}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
