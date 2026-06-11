import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { deletarPlano } from './actions'
import { CalendarClock, CheckCircle, XCircle, ClipboardList, Pencil } from 'lucide-react'

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  ultimaGeracao: string | null
  ambiente: { nome: string }
  tecnico: { email: string } | null
}

type ApiResponse = { data: Plano[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

export default async function PlanosPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let result: ApiResponse = { data: [], total: 0, page: 1, perPage: 20 }
  try {
    result = await api.get<ApiResponse>(`/planos-manutencao?page=${currentPage}&perPage=20`)
  } catch { /* API indisponível */ }

  const planos = result.data

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Planos Preventivos</h1>
          <p className="text-gray-500 text-sm mt-1">Motor Cron executa diariamente às 00:00:01</p>
        </div>
        <a href="/planos-manutencao/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors">
          + Novo Plano
        </a>
      </div>

      {planos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <CalendarClock size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Ambiente', 'Técnico', 'Frequência', 'Próxima Geração', 'Última Geração', 'Ativo', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {planos.map((p) => (
                <tr key={p.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.ambiente?.nome}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {p.tecnico?.email ?? <span className="italic">Não atribuído</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">A cada {p.frequenciaDias} dia(s)</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{new Date(p.proximaGeracao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {p.ultimaGeracao ? new Date(p.ultimaGeracao).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.ativo ? <CheckCircle size={16} className="text-action" /> : <XCircle size={16} className="text-destructive" />}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/planos-manutencao/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                        title="Ver O.S. geradas e detalhes do plano"
                      >
                        <ClipboardList size={13} />
                        O.S.
                      </a>
                      <a
                        href={`/planos-manutencao/${p.id}/editar`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action/10 text-action text-xs font-semibold rounded-lg hover:bg-action/20 transition-colors"
                        title="Editar plano"
                      >
                        <Pencil size={13} />
                        Editar
                      </a>
                      <DeleteButton action={deletarPlano.bind(null, p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Suspense>
            <ListPagination page={currentPage} total={result.total} perPage={result.perPage} basePath="/planos-manutencao" />
          </Suspense>
        </div>
      )}
    </div>
  )
}
