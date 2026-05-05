import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OSSA · Agent Dashboard',
  description: 'Open Standard for Service Agents — Live Governance Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="grid-bg">
        <div className="glow-blue-top" />
        <div className="glow-violet-right" />
        {children}
      </body>
    </html>
  )
}
