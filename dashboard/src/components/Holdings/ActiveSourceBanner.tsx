'use client'

interface Props {
  source: 'default' | 'uploaded'
  fundName: string
  holdingCount: number
}

export default function ActiveSourceBanner({ source, fundName, holdingCount }: Props) {
  return (
    <div
      style={{
        padding: '6px 24px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        fontSize: '0.6875rem',
        color: 'var(--color-muted)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {source === 'uploaded' && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: 'var(--color-green)',
            flexShrink: 0,
          }}
        />
      )}
      <span>
        Analysing:{' '}
        <span style={{ color: 'var(--color-text)' }}>{fundName}</span>
        {' · '}
        {holdingCount} holdings
        {' · '}
        <span style={{ color: source === 'uploaded' ? 'var(--color-green)' : 'var(--color-muted)' }}>
          {source === 'uploaded' ? 'Uploaded' : 'Default dataset'}
        </span>
      </span>
    </div>
  )
}
