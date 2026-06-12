import { api } from '@/lib/api'
import Sidebar from '@/components/layout/sidebar'

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const config = await api.get<Config>('/configuracao').catch(() => null)

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar config={config} />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-y-auto print:p-0 print:w-full print:overflow-visible">
        {children}
      </main>
    </div>
  )
}
