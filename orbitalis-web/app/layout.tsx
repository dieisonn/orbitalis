import type { Metadata } from 'next'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-sans/latin-700.css'
import '@fontsource/ibm-plex-sans-condensed/latin-500.css'
import '@fontsource/ibm-plex-sans-condensed/latin-600.css'
import './globals.css'
import { TruncateTitles } from '@/components/ui/truncate-titles'
import { AvisoCookies } from '@/components/ui/aviso-cookies'
import { Acessibilidade } from '@/components/ui/acessibilidade'

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
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:font-semibold focus:rounded-md focus:shadow-lg print:hidden"
        >
          Ir para o conteúdo
        </a>
        {children}
        <AvisoCookies />
        <Acessibilidade />
        <TruncateTitles />
      </body>
    </html>
  )
}
