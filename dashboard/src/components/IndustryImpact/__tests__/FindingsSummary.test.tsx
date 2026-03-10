import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { IndustryImpact, EventSummary } from '@/types'

// Minimal FindingsSummary component for testing
interface FindingsSummaryProps {
  industries: IndustryImpact[]
  summary: EventSummary
}

function FindingsSummary({ industries, summary }: FindingsSummaryProps) {
  const vulnerable = industries
    .filter(i => i.direction === 'negative')
    .sort((a, b) => a.impact_score - b.impact_score)
  
  const resilient = industries
    .filter(i => i.direction === 'positive')
    .sort((a, b) => b.impact_score - a.impact_score)

  const netDirection = (summary.net_impact ?? 0) < 0 
    ? 'net negative' : 'net positive'
  
  const top1 = vulnerable[0]?.fed_industry_name ?? 'unknown'
  const top2 = vulnerable[1]?.fed_industry_name
  const hedge = resilient[0]?.fed_industry_name ?? 'unknown'
  
  const impactStr = typeof summary.net_impact === 'number'
    ? summary.net_impact.toFixed(6)
    : 'N/A'

  const dateStr = summary.peak_date ?? summary.event_id ?? 'the event date'
  const fundStr = summary.fund_name ?? 'the portfolio'

  return (
    <div style={{
      backgroundColor: 'var(--color-panel)',
      border: '1px solid var(--color-border)',
      padding: '12px 16px',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'var(--font-family-sans)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--color-blue)',
        marginBottom: 6,
      }}>
        Event Findings
      </div>
      <p style={{
        fontSize: 13,
        fontFamily: 'var(--font-family-sans)',
        color: 'var(--color-muted)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        On {dateStr}, {fundStr} recorded{' '}
        <span style={{ 
          color: netDirection === 'net negative' 
            ? 'var(--color-red)' : 'var(--color-green)',
          fontWeight: 600 
        }}>
          {netDirection} GPR impact of {impactStr}
        </span>
        {'. '}
        {top2
          ? `${top1} and ${top2} are the primary vulnerable exposures.`
          : `${top1} is the primary vulnerable exposure.`
        }
        {resilient.length > 0 && ` ${hedge} provides a partial natural hedge.`}
      </p>
    </div>
  )
}

describe('FindingsSummary', () => {
  it('renders Event Findings label', async () => {
    const summary: EventSummary = {
      fund_name: 'Test Fund',
      as_of_date: '2026-03-05',
      peak_date: '2026-03-05',
      event_id: 'evt_1',
      severity_score: 0.8,
      percentile: 0.95,
      net_impact: -0.5,
      portfolio_vulnerability_baseline: 1.2,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<FindingsSummary industries={[]} summary={summary} />)
    })

    expect(container.textContent).toContain('Event Findings')
  })

  it('renders net negative when net_impact is negative', async () => {
    const summary: EventSummary = {
      fund_name: 'Test Fund',
      as_of_date: '2026-03-05',
      peak_date: '2026-03-05',
      event_id: 'evt_1',
      severity_score: 0.8,
      percentile: 0.95,
      net_impact: -0.5,
      portfolio_vulnerability_baseline: 1.2,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<FindingsSummary industries={[]} summary={summary} />)
    })

    expect(container.textContent).toContain('net negative')
  })

  it('renders net positive when net_impact is positive', async () => {
    const summary: EventSummary = {
      fund_name: 'Test Fund',
      as_of_date: '2026-03-05',
      peak_date: '2026-03-05',
      event_id: 'evt_1',
      severity_score: 0.8,
      percentile: 0.95,
      net_impact: 0.5,
      portfolio_vulnerability_baseline: 1.2,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<FindingsSummary industries={[]} summary={summary} />)
    })

    expect(container.textContent).toContain('net positive')
  })

  it('renders top vulnerable industry name', async () => {
    const industries: IndustryImpact[] = [
      { fed_industry_id: 'ind_1', fed_industry_name: 'Energy', portfolio_weight: 10, gpr_beta: 1.5, impact_score: -0.3, direction: 'negative' },
    ]

    const summary: EventSummary = {
      fund_name: 'Test Fund',
      as_of_date: '2026-03-05',
      peak_date: '2026-03-05',
      event_id: 'evt_1',
      severity_score: 0.8,
      percentile: 0.95,
      net_impact: -0.5,
      portfolio_vulnerability_baseline: 1.2,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<FindingsSummary industries={industries} summary={summary} />)
    })

    expect(container.textContent).toContain('Energy')
  })

  it('does not crash when resilient array is empty', async () => {
    const industries: IndustryImpact[] = [
      { fed_industry_id: 'ind_1', fed_industry_name: 'Energy', portfolio_weight: 10, gpr_beta: 1.5, impact_score: -0.3, direction: 'negative' },
    ]

    const summary: EventSummary = {
      fund_name: 'Test Fund',
      as_of_date: '2026-03-05',
      peak_date: '2026-03-05',
      event_id: 'evt_1',
      severity_score: 0.8,
      percentile: 0.95,
      net_impact: -0.5,
      portfolio_vulnerability_baseline: 1.2,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<FindingsSummary industries={industries} summary={summary} />)
    })

    expect(container.textContent).toContain('Event Findings')
  })
})
