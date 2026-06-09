import Link from 'next/link'
import { logout } from '@/lib/auth'
import { ClipboardList, LogOut } from 'lucide-react'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex flex-col w-56 min-h-screen bg-primary text-white shrink-0 print:hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-xl font-bold tracking-wide">Orbitalis</p>
          <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-widest">
            Portal do Técnico
          </p>
        </div>

        <nav className="flex-1 py-4">
          <Link
            href="/minhas-os"
            className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ClipboardList size={16} />
            Minhas O.S.
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-2 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
