import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { ExportarClientesButton } from '@/components/ui/clientes-import-export'
import { ImportarClientesButton } from '@/components/ui/importar-clientes'
import { ConvidarBtn } from '@/components/ui/convidar-btn'
import { deletarCliente } from './actions'
import { Users, Building2, Phone } from 'lucide-react'

type Cliente = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  documento: string | null
  endereco: string
  telefone: string | null
  celular: string | null
  email: string | null
  cidade: string | null
  uf: string | null
  usuarioId: string | null
  ambientes: { id: string }[]
}

type ApiResponse = { data: Cliente[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string; q?: string }> }

export default async function ClientesPage({ searchParams }: Props) {
  const { page, q } = await searchParams
  const currentPage = Number(page) || 1
  const busca = q?.trim() ?? ''

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/clientes?page=${currentPage}&perPage=20${busca ? `&q=${encodeURIComponent(busca)}` : ''}`)
  } catch { /* API indisponível */ }

  const clientes = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{busca ? `${result.total} resultado(s) para “${busca}”` : `${result.total} cliente(s) cadastrado(s)`}</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportarClientesButton />
          <ExportarClientesButton />
          <a href="/clientes/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
            + Novo Cliente
          </a>
        </div>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search" name="q" defaultValue={busca}
          placeholder="Buscar por nome, CPF/CNPJ, e-mail ou cidade"
          className="flex-1 max-w-md px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-md hover:bg-surface">Buscar</button>
        {busca && <a href="/clientes" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">Limpar</a>}
      </form>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <Users size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-500 text-sm">{busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Razão Social</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CPF/CNPJ</th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone</th>
                <th className="hidden xl:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amb.</th>
                <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 min-w-[220px]">
                    <p className="font-medium text-gray-900">{c.razaoSocial}</p>
                    {c.nomeFantasia && <p className="text-xs text-gray-400">{c.nomeFantasia}</p>}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-gray-600 font-mono text-xs">{c.documento ?? <span className="text-gray-400">sem documento</span>}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {c.telefone || c.celular
                      ? <span className="inline-flex items-center gap-1"><Phone size={11} className="text-primary/40" />{c.telefone ?? c.celular}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="hidden xl:table-cell px-4 py-3 text-gray-500 max-w-[260px] truncate">{c.endereco || (c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ''}` : <span className="text-gray-300">—</span>)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                      <Building2 size={12} />{c.ambientes?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/clientes/${c.id}`} className="text-xs font-semibold text-primary hover:underline">Ver</a>
                      <a href={`/clientes/${c.id}/editar`} className="hidden sm:inline text-xs font-semibold text-gray-500 hover:underline">Editar</a>
                      {c.usuarioId
                        ? <span className="hidden sm:inline text-[11px] font-semibold text-emerald-600" title="Este cliente já acessa o portal">Acesso ativo</span>
                        : <ConvidarBtn tipo="cliente" clienteId={c.id} label="Convidar" variant="link" />}
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
