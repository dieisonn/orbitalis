import { Suspense } from 'react'
import { api } from '@/lib/api'
import { ListPagination } from '@/components/ui/list-pagination'
import { AmbientesList } from './ambientes-list'

type Equipamento = {
  id: string
  nome: string
  tipoEquipamento: string
}

type Ambiente = {
  id: string
  nome: string
  metrosQuadrados: number
  capacidadeTermica: string
  localizacaoInterna: string
  clienteId: string
  equipamentos: Equipamento[]
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

type ApiResponse = { data: Ambiente[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function AmbientesPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 200 }
  try {
    result = await api.get<ApiResponse>(`/ambientes?page=${currentPage}&perPage=200`)
  } catch { /* API indisponível */ }

  const ambientes = result.data

  // Agrupa por cliente
  const porCliente = new Map<string, { cliente: NonNullable<Ambiente['cliente']>; ambientes: Ambiente[] }>()
  for (const a of ambientes) {
    if (!a.cliente) continue
    if (!porCliente.has(a.cliente.id)) {
      porCliente.set(a.cliente.id, { cliente: a.cliente, ambientes: [] })
    }
    porCliente.get(a.cliente.id)!.ambientes.push(a)
  }
  const grupos = Array.from(porCliente.values()).sort((a, b) =>
    (a.cliente.nomeFantasia ?? a.cliente.razaoSocial).localeCompare(b.cliente.nomeFantasia ?? b.cliente.razaoSocial)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Ambientes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {result.total} ambiente(s) em {grupos.length} cliente(s)
          </p>
        </div>
        <a
          href="/ambientes/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Novo Ambiente
        </a>
      </div>

      <AmbientesList grupos={grupos} />

      {result.total > result.perPage && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <Suspense>
            <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/ambientes" />
          </Suspense>
        </div>
      )}
    </div>
  )
}
