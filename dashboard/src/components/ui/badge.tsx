import React from 'react'

type Variant = 'positive' | 'negative' | 'warning' | 'neutral' | 'blue'

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  positive: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
  },
  negative: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    color: '#f43f5e',
    border: '1px solid rgba(244,63,94,0.2)',
  },
  warning: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  neutral: {
    backgroundColor: 'rgba(100,116,139,0.1)',
    color: '#94a3b8',
    border: '1px solid rgba(100,116,139,0.2)',
  },
  blue: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
  },
}

interface BadgeProps {
  children?: React.ReactNode
  variant?: Variant
  style?: React.CSSProperties
  className?: string
}

export function Badge({ children, variant = 'neutral', style, className }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        fontFamily: 'var(--font-family-sans)',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export default Badge
