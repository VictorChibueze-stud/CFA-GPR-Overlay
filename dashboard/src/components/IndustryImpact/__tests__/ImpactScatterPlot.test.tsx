import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// mock ResizeObserver used by Recharts ResponsiveContainer in jsdom
// @ts-expect-error - ResizeObserver mock
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

import ImpactScatterPlot from '../ImpactScatterPlot'

const sample = [
  { fed_industry_id: 'a', fed_industry_name: 'A', portfolio_weight: 5, gpr_beta: 0.01, impact_score: 0.05, direction: 'positive' },
  { fed_industry_id: 'b', fed_industry_name: 'B', portfolio_weight: 12, gpr_beta: -0.02, impact_score: -0.24, direction: 'negative' },
  { fed_industry_id: 'c', fed_industry_name: 'C', portfolio_weight: 2, gpr_beta: 0.005, impact_score: 0.01, direction: 'neutral' },
]

test('ImpactScatterPlot renders and includes recharts wrapper svg', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  await act(async () => {
    createRoot(container).render(<ImpactScatterPlot industries={sample as Record<string, unknown>[]} />)
  })

  // Recharts should render an SVG wrapper
  const svg = container.querySelector('svg')
  expect(svg).toBeTruthy()
})
