import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ClusterAccordion from '../ClusterAccordion'

describe('ClusterAccordion tag formatting', () => {
  beforeAll(() => {
    ;(global as typeof globalThis).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver
  })

  it('formats channel types and threat category', async () => {
    const cluster = {
      cluster_id: 'cluster_1',
      region: 'EMEA',
      threat_category: 'escalation_of_war',
      economic_channels: [
        { channel_id: 'c1', channel_type: 'energy_commodity', description: '', linked_industries: [] },
      ],
      primary_actors: [],
      time_range: null,
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<ClusterAccordion clusters={[cluster as Record<string, unknown>]} />)
    })

    // Open the accordion item so channel chips are rendered
    const button = container.querySelector('button') as HTMLElement | null
    if (button) {
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }

    const text = container.textContent || ''
    expect(text).not.toContain('energy_commodity')
    expect(text).toContain('Energy Commodity')
    expect(text).toContain('Escalation')
  })
})
