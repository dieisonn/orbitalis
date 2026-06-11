import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarCliente } from './actions'
import { Users, Building2 } from 'lucide-react'

type Cliente = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  documento: string
  endereco: string
  ambientes: { id: string }[]
}

type ApiResponse = { data: Cliente[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function ClientesPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/clientes?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const clientes = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{result.total} cliente(s) cadastrado(s)</p>
        </div>
        <a href="/clientes/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          + Novo Cliente
        </a>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Users size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Razão Social</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ambientes</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{c.razaoSocial}</p>
                    {c.nomeFantasia && <p className="text-xs text-gray-400">{c.nomeFantasia}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">{c.documento}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{c.endereco}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                      <Building2 size={12} />{c.ambientes?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/clientes/${c.id}`} className="text-xs font-semibold text-primary hover:underline">Ver</a>
                      <a href={`/clientes/${c.id}/editar`} className="text-xs font-semibold text-gray-500 hover:underline">Editar</a>
                      <DeleteButton action={deletarCliente.bind(null, c.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Suspense>
            <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/clientes" />
          </Suspense>
        </div>
      )}
    </div>
  )
}
