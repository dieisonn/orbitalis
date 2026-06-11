import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarAmbiente } from './actions'
import { Building2, Cpu } from 'lucide-react'

type Ambiente = {
  id: string
  nome: string
  metrosQuadrados: number
  capacidadeTermica: string
  localizacaoInterna: string
  equipamentos: { id: string }[]
  cliente: { razaoSocial: string; nomeFantasia: string | null } | null
}

type ApiResponse = { data: Ambiente[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function AmbientesPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/ambientes?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const ambientes = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Ambientes</h1>
          <p className="text-gray-500 text-sm mt-1">{result.total} área(s) física(s) cadastrada(s)</p>
        </div>
        <a href="/ambientes/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          + Novo Ambiente
        </a>
      </div>

      {ambientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum ambiente cadastrado.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ambientes.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{a.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.localizacaoInterna}</p>
                    {a.cliente && (
                      <p className="text-xs text-primary/70 mt-0.5 font-medium">{a.cliente.nomeFantasia ?? a.cliente.razaoSocial}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                    <Cpu size={10} />{a.equipamentos?.length ?? 0} eq.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">Área</span>
                    {Number(a.metrosQuadrados).toFixed(1)} m²
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">Cap. Térmica</span>
                    {a.capacidadeTermica}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                  <a href={`/ambientes/${a.id}/editar`} className="text-xs font-semibold text-primary hover:underline">Editar</a>
                  <DeleteButton action={deletarAmbiente.bind(null, a.id)} />
                </div>
              </div>
            ))}
          </div>
          {result.total > result.perPage && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <Suspense>
                <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/ambientes" />
              </Suspense>
            </div>
          )}
        </>
      )}
    </div>
  )
}
