export default function ColourLegend() {
  const items = [
    { label: 'Vulnerable', color: 'var(--color-red)' },
    { label: 'Resilient',  color: 'var(--color-green)' },
    { label: 'Neutral',    color: 'var(--color-muted)' },
  ]
  return (
    <div style={{ 
      display: 'flex', 
      gap: 20, 
      alignItems: 'center',
      marginBottom: 12,
    }}>
      {items.map(item => (
        <div key={item.label} style={{ 
          display: 'flex', alignItems: 'center', gap: 6 
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: item.color,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-family-sans)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-muted)',
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
