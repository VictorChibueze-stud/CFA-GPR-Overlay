import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import DashboardShell from '@/components/DashboardShell'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'GPR Intelligence Dashboard',
  description: 'Geopolitical Risk overlay for equity portfolios',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  )
}
