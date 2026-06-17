import { api } from '@/lib/api'
import { ExportOsBtn } from './export-os-btn'
import { FileSpreadsheet } from 'lucide-react'

type Tecnico = { id: string; nome: string | null; email: string }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export default async function RelatoriosPage() {
  const [tecnicosRes, clientesRes] = await Promise.all([
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=200').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Cliente[] }>('/clientes?perPage=200').catch(() => ({ data: [] as Cliente[] })),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Exporte dados para análise externa</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Exportar Ordens de Serviço</h2>
            <p className="text-xs text-gray-400">Gera planilha Excel (.xlsx) com filtros opcionais</p>
          </div>
        </div>

        <ExportOsBtn tecnicos={tecnicosRes.data} clientes={clientesRes.data} />
      </div>
    </div>
  )
}
