'use client'

import { useIndustryImpact } from '@/hooks/useIndustryImpact'
import { useHoldings } from '@/hooks/useHoldings'
import { useAgentIntelligence } from '@/hooks/useAgentIntelligence'

export default function DataTestPage() {
  const { industries } = useIndustryImpact()
  const { allHoldings } = useHoldings()
  const { clusters, watchlist } = useAgentIntelligence()

  return (
    <main className="flex-1 p-8">
      <h1 className="font-mono text-2xl" style={{ color: 'var(--color-text)' }}>Data Layer Test</h1>
      <ul style={{ color: 'var(--color-muted)', marginTop: '1rem', fontFamily: 'monospace' }}>
        <li>Industries: {industries.length}</li>
        <li>Holdings: {allHoldings.length}</li>
        <li>Clusters: {clusters.length}</li>
        <li>Watchlist: {watchlist.length}</li>
      </ul>
    </main>
  )
}
