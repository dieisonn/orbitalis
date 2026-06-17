import { api } from '@/lib/api'
import { EquipamentosView, type EquipamentoItem } from './equipamentos-view'
import { deletarEquipamento } from './actions'
import {
  ExportarEquipamentosButton,
  ImportarEquipamentosButton,
} from '@/components/ui/equipamentos-import-export'

type ApiResponse = {
  data: EquipamentoItem[]
  total: number
  page: number
  perPage: number
}

export default async function EquipamentosPage() {
  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 500 }
  try {
    result = await api.get<ApiResponse>('/equipamentos?page=1&perPage=500')
  } catch { /* API indisponível */ }

  const equipamentos = result.data

  const stats = {
    total:        result.total,
    tiposUnicos:  new Set(equipamentos.map((e) => e.tipoEquipamento)).size,
    totalNovos:   equipamentos.filter((e) => e.condicao === 'novo').length,
    valorTotal:   equipamentos.reduce(
      (s, e) => s + (e.valorAquisicao != null ? parseFloat(String(e.valorAquisicao)) : 0),
      0,
    ),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">{result.total} ativo(s) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportarEquipamentosButton />
          <ImportarEquipamentosButton />
          <a
            href="/equipamentos/novo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
          >
            + Novo Equipamento
          </a>
        </div>
      </div>

      <EquipamentosView equipamentos={equipamentos} stats={stats} deletarAction={deletarEquipamento} />
    </div>
  )
}
