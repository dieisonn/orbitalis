import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarAmbiente } from './actions'
import { Building2, Cpu, ChevronDown } from 'lucide-react'

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
      <div className="flex items-center justify-between mb-8">
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

      {grupos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum ambiente cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ cliente, ambientes: ambs }) => (
            <div key={cliente.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              {/* Cabeçalho do grupo cliente */}
              <div className="flex items-center justify-between px-6 py-3 bg-primary/5 border-b border-border">
                <div className="flex items-center gap-2">
                  <ChevronDown size={14} className="text-primary/60" />
                  <span className="font-bold text-primary text-sm">
                    {cliente.nomeFantasia ?? cliente.razaoSocial}
                  </span>
                  {cliente.nomeFantasia && (
                    <span className="text-xs text-gray-400">{cliente.razaoSocial}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {ambs.length} ambiente(s) · {ambs.reduce((s, a) => s + (a.equipamentos?.length ?? 0), 0)} equipamento(s)
                </span>
              </div>

              {/* Tabela de ambientes do cliente */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['Ambiente', 'Localização Interna', 'Área', 'Cap. Térmica', 'Equipamentos', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ambs.map((a) => (
                    <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-900">{a.nome}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{a.localizacaoInterna}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {Number(a.metrosQuadrados).toFixed(0)} m²
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{a.capacidadeTermica}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                          <Cpu size={10} />{a.equipamentos?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/ambientes/${a.id}/editar`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Editar
                          </a>
                          <DeleteButton action={deletarAmbiente.bind(null, a.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

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
