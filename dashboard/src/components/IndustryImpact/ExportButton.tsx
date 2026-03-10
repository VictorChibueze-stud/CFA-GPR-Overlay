'use client'

import { Download } from 'lucide-react'
import type { IndustryImpact } from '@/types'

interface Props {
  industries: IndustryImpact[]
  filename?: string
}

export default function ExportButton({ industries, filename = 'industry-impact.csv' }: Props) {
  function handleExport() {
    const header = 'Industry,Weight,Beta,ImpactScore,Direction'
    const rows = industries.map(ind =>
      [
        `"${ind.fed_industry_name}"`,
        ind.portfolio_weight.toFixed(4),
        ind.gpr_beta.toFixed(6),
        ind.impact_score.toFixed(6),
        ind.direction,
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid var(--color-border)',
        background: 'none',
        cursor: 'pointer',
        color: 'var(--color-muted)',
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}
    >
      <Download size={13} />
      Export CSV
    </button>
  )
}
