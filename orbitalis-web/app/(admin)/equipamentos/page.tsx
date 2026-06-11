import { Suspense } from 'react'
import { api } from '@/lib/api'
import { EquipamentosTable } from '@/components/ui/equipamentos-table'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarEquipamento } from './actions'
import { Cpu } from 'lucide-react'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  } | null
}

type ApiResponse = { data: Equipamento[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function EquipamentosPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/equipamentos?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const equipamentos = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">{result.total} ativo(s) cadastrado(s)</p>
        </div>
        <a href="/equipamentos/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          + Novo Equipamento
        </a>
      </div>

      {equipamentos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Cpu size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum equipamento cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <EquipamentosTable equipamentos={equipamentos} deletarAction={deletarEquipamento} />
          <Suspense>
            <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/equipamentos" />
          </Suspense>
        </div>
      )}
    </div>
  )
}
