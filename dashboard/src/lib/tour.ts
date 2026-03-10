import { driver } from 'driver.js'

export function initTour() {
  return driver({
    animate: true,
    smoothScroll: true,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Got it',
    steps: [
      {
        element: '#nav-event-monitor',
        popover: {
          title: 'GPR Event Monitor',
          description:
            'The full Caldara & Iacoviello GPR index from 1985 to today. Use the brush below the chart to zoom into any time window.',
        },
      },
      {
        element: '#nav-industry-impact',
        popover: {
          title: 'Industry Impact',
          description:
            'See which sectors your portfolio is exposed to. Bar chart ranks industries by impact score. Scatter plot shows weight vs sensitivity.',
        },
      },
      {
        element: '#nav-holdings',
        popover: {
          title: 'Holdings Table',
          description:
            'Upload your own portfolio CSV to analyse any fund against this event. Default shows iShares LCTD.',
        },
      },
      {
        element: '#nav-agent-intelligence',
        popover: {
          title: 'Agent Intelligence',
          description:
            '3-agent AI pipeline output: threat clusters, priority watchlist, and deep dive verdicts per holding.',
        },
      },
      {
        element: '#glossary-btn',
        popover: {
          title: 'Glossary & Help',
          description: 'Every technical term defined. Click ? any time to reopen.',
        },
      },
    ],
  })
}
