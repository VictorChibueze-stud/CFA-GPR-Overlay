import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

function ColourLegend() {
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

describe('ColourLegend', () => {
  it('renders all 3 labels: Vulnerable, Resilient, Neutral', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<ColourLegend />)
    })

    const text = container.textContent || ''
    expect(text).toContain('Vulnerable')
    expect(text).toContain('Resilient')
    expect(text).toContain('Neutral')
  })

  it('renders 3 dot elements', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    await act(async () => {
      createRoot(container).render(<ColourLegend />)
    })

    const dots = container.querySelectorAll('span[style*="border-radius: 50%"]')
    expect(dots.length).toBe(3)
  })
})
