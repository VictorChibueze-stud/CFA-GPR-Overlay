import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import DeepDivePanel from '../DeepDivePanel'

// Mock data modules used by DeepDivePanel
jest.mock('@/data/level1_clusters.json', () => ({
  channels_by_cluster: [
    { cluster_id: 'cluster_1', economic_channels: [{ channel_type: 'supply_chain' }] },
  ],
}), { virtual: true })

jest.mock('@/data/level3_deepdive.json', () => ({
  clusters: [
    {
      cluster_id: 'cluster_1',
      likely_affected_holdings: [
        { company_name: 'Acme Corp', resolved_symbol: 'ACME', weight_pct: 1.23, fed_industry_name: 'Industry', impact_direction: 'positive', confidence: 0.85, rationale: 'Top holding', linked_evidence_titles: [] },
        { company_name: 'Beta LLC', resolved_symbol: 'BETA', weight_pct: 0.5, fed_industry_name: 'Industry', impact_direction: 'negative', confidence: 0.4, rationale: '', linked_evidence_titles: [] },
      ],
      maybe_affected_holdings: [
        { company_name: 'Maybe Co', resolved_symbol: 'MB', weight_pct: 0.3, fed_industry_name: 'Industry', impact_direction: 'neutral', confidence: 0.6, rationale: '', linked_evidence_titles: [] },
      ],
    }
  ],
}), { virtual: true })

describe('DeepDivePanel compact indicators', () => {
  beforeAll(() => {
    // Mock ResizeObserver for jsdom
    ;(global as typeof globalThis).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver
  })

  it('renders without crashing and uses compact dot indicators', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<DeepDivePanel />)
    })

    // Ensure wide text badges are gone
    expect(container.textContent).not.toContain('POSITIVE')
    expect(container.textContent).not.toContain('NEGATIVE')

    // Check for compact dot indicators (inline style contains border-radius: 50%)
    const dots = container.querySelectorAll('[style*="border-radius: 50%"]')
    expect(dots.length).toBeGreaterThan(0)
  })
})
