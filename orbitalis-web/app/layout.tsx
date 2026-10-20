import type { Metadata } from 'next'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-sans/latin-700.css'
import '@fontsource/ibm-plex-sans-condensed/latin-500.css'
import '@fontsource/ibm-plex-sans-condensed/latin-600.css'
import './globals.css'
import { TruncateTitles } from '@/components/ui/truncate-titles'

export const metadata: Metadata = {
  title: 'Orbitalis — Gestão de Ativos',
  description: 'DADOS EM ÓRBITA. MANUTENÇÃO EM DIA.',
  icons: { icon: '/favicon.ico', apple: '/logo.png' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Orbitalis',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      {/* Script inline: aplica .is-dark antes do primeiro render para evitar flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('orbitalis-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(dark)document.documentElement.classList.add('is-dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <TruncateTitles />
      </body>
    </html>
  )
}
