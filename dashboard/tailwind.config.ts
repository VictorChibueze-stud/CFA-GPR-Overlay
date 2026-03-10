import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0d1117',
        panel:   '#161b22',
        border:  '#21262d',
        amber:   '#f59e0b',
        red:     '#ef4444',
        green:   '#22c55e',
        muted:   '#8b949e',
        text:    '#e6edf3',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
