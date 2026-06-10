import { api } from '@/lib/api'
import Sidebar from '@/components/layout/sidebar'

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const config = await api.get<Config>('/configuracao').catch(() => null)

  return (
    <div className="flex min-h-screen">
      <Sidebar config={config} />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto print:p-0">
        {children}
      </main>
    </div>
  )
}
