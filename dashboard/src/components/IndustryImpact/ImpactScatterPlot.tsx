'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label,
} from 'recharts'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import type { IndustryImpact } from '@/types'

interface Props {
  industries: IndustryImpact[]
}

const DIRECTION_COLORS: Record<string, string> = {
  negative: 'var(--color-red)',
  positive: 'var(--color-green)',
  neutral:  'var(--color-muted)',
}

interface TooltipPayloadItem {
  payload: IndustryImpact & { z: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const dirColor = DIRECTION_COLORS[d.direction] ?? 'var(--color-muted)'
  return (
    <div
      style={{
        backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        padding: '10px 14px',
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        fontSize: '0.75rem',
        color: 'var(--color-text)',
        maxWidth: 260,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.fed_industry_name}</div>
      <div style={{ color: 'var(--color-muted)' }}>
        Weight: <span style={{ color: 'var(--color-text)' }}>{d.portfolio_weight.toFixed(2)}%</span>
      </div>
      <div style={{ color: 'var(--color-muted)' }}>
        GPR Beta: <span style={{ color: 'var(--color-text)' }}>{d.gpr_beta.toFixed(6)}</span>
      </div>
      <div style={{ color: 'var(--color-muted)' }}>
        Impact: <span style={{ color: dirColor }}>{d.impact_score.toFixed(6)}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <span
          style={{
            backgroundColor: `${dirColor}22`,
            color: dirColor,
            border: `1px solid ${dirColor}44`,
            padding: '1px 8px',
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {d.direction}
        </span>
      </div>
    </div>
  )
}

export default function ImpactScatterPlot({ industries }: Props) {
  // Split by direction for per-group colouring
  const negative = industries.filter(d => d.direction === 'negative')
  const positive = industries.filter(d => d.direction === 'positive')
  const neutral  = industries.filter(d => d.direction === 'neutral')

  // Reference line midpoints / quadrant boundaries
  const weights = industries.map(d => d.portfolio_weight)
  const betas = industries.map(d => d.gpr_beta)
  const maxX = weights.length ? Math.max(...weights) : 0
  const minY = betas.length ? Math.min(...betas) : 0
  const maxY = betas.length ? Math.max(...betas) : 0
  const midX = weights.length ? weights.reduce((s, v) => s + v, 0) / weights.length : 0
  const midY = 0 // natural dividing line for beta

  // Attach z values for ZAxis
  const withZ = (arr: IndustryImpact[]) =>
    arr.map(d => ({ ...d, z: Math.abs(d.impact_score) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RadixTooltip.Provider>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              fontSize: '0.625rem',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Weight vs Sensitivity
          </span>
          <RadixTooltip.Root>
            <RadixTooltip.Trigger asChild>
              <span style={{ cursor: 'help', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}>
                <Info size={11} />
              </span>
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
              <RadixTooltip.Content
                side="right"
                sideOffset={4}
                style={{
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-ibm-plex-mono), monospace',
                  fontSize: '0.6875rem',
                  color: 'var(--color-muted)',
                  maxWidth: 300,
                  lineHeight: 1.5,
                  zIndex: 999,
                }}
              >
                Top-right quadrant: high portfolio weight AND high GPR sensitivity — most exposed position
                <RadixTooltip.Arrow style={{ fill: 'var(--color-border)' }} />
              </RadixTooltip.Content>
            </RadixTooltip.Portal>
          </RadixTooltip.Root>
        </div>
      </RadixTooltip.Provider>

    <div style={{ flex: 1, minHeight: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
        {/* Quadrant shading (render before Scatter so it's behind points) */}
        {/* Top-right: high weight, positive beta (opportunity) */}
        <ReferenceArea x1={midX} x2={maxX * 1.1} y1={midY} y2={maxY * 1.1} fill="#22c55e" fillOpacity={0.04} stroke="none">
          <Label value="HIGH WEIGHT · RESILIENT" position="insideTopRight" fill="#22c55e" fontSize={9} opacity={0.6} />
        </ReferenceArea>
        {/* Bottom-right: high weight, negative beta (danger) */}
        <ReferenceArea x1={midX} x2={maxX * 1.1} y1={minY * 1.1} y2={midY} fill="#ef4444" fillOpacity={0.07} stroke="none">
          <Label value="HIGH WEIGHT · VULNERABLE" position="insideBottomRight" fill="#ef4444" fontSize={9} opacity={0.6} />
        </ReferenceArea>
        {/* Top-left: low weight, positive beta */}
        <ReferenceArea x1={0} x2={midX} y1={midY} y2={maxY * 1.1} fill="#22c55e" fillOpacity={0.02} stroke="none">
          <Label value="LOW WEIGHT · RESILIENT" position="insideTopLeft" fill="#22c55e" fontSize={9} opacity={0.4} />
        </ReferenceArea>
        {/* Bottom-left: low weight, negative beta */}
        <ReferenceArea x1={0} x2={midX} y1={minY * 1.1} y2={midY} fill="#ef4444" fillOpacity={0.02} stroke="none">
          <Label value="LOW WEIGHT · VULNERABLE" position="insideBottomLeft" fill="#ef4444" fontSize={9} opacity={0.4} />
        </ReferenceArea>
        <XAxis
          type="number"
          dataKey="portfolio_weight"
          name="Portfolio Weight"
          tick={{
            fill: 'var(--color-muted)',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            fontSize: 11,
          }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        >
          <Label
            value="Portfolio Weight %"
            position="insideBottom"
            offset={-16}
            style={{
              fill: 'var(--color-muted)',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              fontSize: 11,
            }}
          />
        </XAxis>
        <YAxis
          type="number"
          dataKey="gpr_beta"
          name="GPR Beta"
          tick={{
            fill: 'var(--color-muted)',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            fontSize: 11,
          }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
          tickFormatter={(v: number) => v.toFixed(4)}
        >
          <Label
            value="GPR Beta"
            angle={-90}
            position="insideLeft"
            offset={10}
            style={{
              fill: 'var(--color-muted)',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              fontSize: 11,
            }}
          />
        </YAxis>
        <ZAxis type="number" dataKey="z" range={[40, 400]} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border)' }} />
        <ReferenceLine x={midX} stroke="var(--color-border)" strokeDasharray="4 4" />
        <ReferenceLine y={midY} stroke="var(--color-border)" strokeDasharray="4 4" />
        {negative.length > 0 && (
          <Scatter
            name="Negative"
            data={withZ(negative)}
            fill="var(--color-red)"
            fillOpacity={0.75}
          />
        )}
        {positive.length > 0 && (
          <Scatter
            name="Positive"
            data={withZ(positive)}
            fill="var(--color-green)"
            fillOpacity={0.75}
          />
        )}
        {neutral.length > 0 && (
          <Scatter
            name="Neutral"
            data={withZ(neutral)}
            fill="var(--color-muted)"
            fillOpacity={0.75}
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
    </div>
    </div>
  )
}
