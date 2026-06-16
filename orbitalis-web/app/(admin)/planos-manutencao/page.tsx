import { Suspense } from 'react'
import { api } from '@/lib/api'
import { DeletePlanoButton } from '@/components/ui/delete-plano-button'
import { ListPagination } from '@/components/ui/list-pagination'
import { CalendarClock, CheckCircle, XCircle, ClipboardList, Pencil } from 'lucide-react'

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  ultimaGeracao: string | null
  cliente: { razaoSocial: string; nomeFantasia: string | null }
  tecnico: { email: string; nome: string | null } | null
  _count: { equipamentosConfig: number }
}

type ApiResponse = { data: Plano[]; total: number; page: number; perPage: number }

type Props = { searchParams: Promise<{ page?: string }> }

const FREQ: Record<number, string> = {
  30: 'Mensal', 60: 'Bimestral', 90: 'Trimestral', 180: 'Semestral', 365: 'Anual',
}

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
                {['Cliente', 'Técnico', 'Equip.', 'Frequência', 'Próxima Geração', 'Ativo', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {planos.map((p) => (
                <tr key={p.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{p.cliente?.nomeFantasia ?? p.cliente?.razaoSocial}</p>
                    {p.cliente?.nomeFantasia && (
                      <p className="text-xs text-gray-400">{p.cliente.razaoSocial}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {p.tecnico ? (p.tecnico.nome ?? p.tecnico.email) : <span className="italic">Não atribuído</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{p._count?.equipamentosConfig ?? 0} eq.</td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    {FREQ[p.frequenciaDias] ?? `A cada ${p.frequenciaDias} dias`}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(p.proximaGeracao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4">
                    {p.ativo
                      ? <CheckCircle size={16} className="text-action" />
                      : <XCircle size={16} className="text-destructive" />}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a href={`/planos-manutencao/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                        <ClipboardList size={13} />Ver
                      </a>
                      <a href={`/planos-manutencao/${p.id}/editar`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action/10 text-action text-xs font-semibold rounded-lg hover:bg-action/20 transition-colors">
                        <Pencil size={13} />Editar
                      </a>
                      <DeletePlanoButton planoId={p.id} />
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
