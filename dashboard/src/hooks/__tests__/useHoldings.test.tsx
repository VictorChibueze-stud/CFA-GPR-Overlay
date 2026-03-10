import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

jest.mock('@/data/holdings_shortlist.json', () => ({
  shortlists_by_industry: {
    'Depository Institutions': [
      {
        security_name_report: 'HSBC HOLDINGS PLC',
        weight_pct: 1.87,
        fed_industry_name: 'Depository Institutions',
        industry_weight_share_for_holding: 0.071,
      },
    ],
  },
}))

const csv = 'Ticker,GPR Beta,Region,Country,Security Name\nHSBA,0.45,Europe,UK,HSBC HOLDINGS PLC\n'

beforeEach(() => {
  // mock global fetch with a slight delay so initial loading=true can be observed
  // @ts-expect-error - mocking fetch for test
  global.fetch = jest.fn(() =>
    new Promise((resolve: (value: unknown) => void) =>
      setTimeout(() => resolve({ text: () => Promise.resolve(csv) }), 20),
    ),
  )
})

afterEach(() => {
  jest.resetAllMocks()
})

import { useHoldings } from '../useHoldings'

function TestComp() {
  const { allHoldings, loading } = useHoldings()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{allHoldings.length}</span>
      <span data-testid="ticker">{allHoldings[0]?.ticker_guess}</span>
      <span data-testid="gpr">{String(allHoldings[0]?.gpr_beta)}</span>
    </div>
  )
}

test('useHoldings loads CSV and merges ticker and gpr_beta', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  await act(async () => {
    createRoot(container).render(<TestComp />)
  })

  // initial render should show loading (true)
  const loadingEl = container.querySelector('[data-testid=loading]')
  expect(loadingEl?.textContent).toBe('true')

  // wait for fetch/parse to complete
  await act(async () => {
    // give promises a tick
    await new Promise(r => setTimeout(r, 50))
  })

  const count = container.querySelector('[data-testid=count]')
  const ticker = container.querySelector('[data-testid=ticker]')
  const gpr = container.querySelector('[data-testid=gpr]')

  expect(count?.textContent && Number(count.textContent)).toBeGreaterThan(0)
  expect(ticker?.textContent).toBeTruthy()
  expect(gpr?.textContent).not.toBe('undefined')
})
