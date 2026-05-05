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
        <link href="https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* No-flash theme init — runs before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ossa-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
      </head>
      <body className="grid-bg">
        <div className="glow-blue-top" />
        <div className="glow-violet-right" />
        {children}
      </body>
    </html>
  )
}
