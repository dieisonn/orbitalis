import { api } from '@/lib/api'
import Sidebar from '@/components/layout/sidebar'
import { SearchPalette } from '@/components/ui/search-palette'

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [config, alertasCount] = await Promise.all([
    api.get<Config>('/configuracao').catch(() => null),
    api.get<{ total: number }>('/alertas/count').then((r) => r.total).catch(() => 0),
  ])

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar config={config} alertasCount={alertasCount} />
      <main className="flex-1 pt-16 pr-4 pb-4 pl-14 md:p-8 overflow-y-auto print:p-0 print:w-full print:overflow-visible">
        {children}
      </main>
      <SearchPalette />
    </div>
  )
}
