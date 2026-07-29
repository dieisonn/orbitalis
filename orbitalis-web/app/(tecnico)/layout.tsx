'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import { ClipboardList, LogOut } from 'lucide-react'
import { OfflineBanner } from '@/components/ui/offline-banner'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="min-h-screen bg-surface">
      {/* Header fixo no topo */}
      <header className="sticky top-0 z-40 bg-primary text-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="bg-white rounded-md px-2 py-1 flex items-center">
          <img src="/logo.png" alt="Orbitalis" className="h-6 w-auto object-contain" />
        </div>
        <span className="text-sm font-semibold text-white/75 tracking-wide">Portal do Técnico</span>
      </header>

      <OfflineBanner />

      {/* Conteúdo principal */}
      <main className="px-4 py-4 pb-20 max-w-xl mx-auto">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-primary border-t border-white/10 flex safe-pb">
        <Link
          href="/minhas-os"
          className={[
            'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-semibold tracking-wide transition-colors',
            path.startsWith('/minhas-os') ? 'text-white' : 'text-white/45 hover:text-white/80',
          ].join(' ')}
        >
          <ClipboardList size={22} />
          Minhas O.S.
        </Link>
        <form action={logout} className="flex-1">
          <button
            type="submit"
            className="w-full h-full flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-semibold tracking-wide text-white/45 hover:text-white/80 transition-colors"
          >
            <LogOut size={22} />
            Sair
          </button>
        </form>
      </nav>
    </div>
  )
}
