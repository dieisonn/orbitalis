import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { TriarForm } from '@/components/ui/triar-form'
import { OsFilterBar } from '@/components/ui/os-filter-bar'
import { FinanceiroForm } from '@/components/ui/financeiro-form'
import { ClipboardList, FileText } from 'lucide-react'

type OrdemServico = {
  id: string
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  ambiente: { nome: string }
  tecnico: { id: string; email: string } | null
  itens: { id: string; statusItem: string }[]
  valorMaoObra: number | null
  valorPecas: number | null
}

type Tecnico = { id: string; email: string }

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente:        'Portal Cliente',
}

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Abertas',
  agendada: 'Agendadas',
  em_andamento: 'Em Andamento',
  concluida: 'Concluídas',
  cancelada: 'Canceladas',
}

type Props = { searchParams: Promise<{ status?: string; q?: string }> }

export default async function OrdensServicoPage({ searchParams }: Props) {
  const { status, q } = await searchParams

  const [allOrdens, tecnicos] = await Promise.all([
    api.get<OrdemServico[]>(`/ordens-servico${status ? `?status=${status}` : ''}`).catch(() => [] as OrdemServico[]),
    api.get<Tecnico[]>('/usuarios/tecnicos').catch(() => [] as Tecnico[]),
  ])

  // Client-side text filter (short ID or ambiente name)
  const ordens = q
    ? allOrdens.filter((o) => {
        const shortId = `OS-${o.id.slice(0, 6).toUpperCase()}`
        const search = q.toUpperCase()
        return shortId.includes(search) || o.ambiente?.nome?.toUpperCase().includes(search)
      })
    : allOrdens

  const aguardandoTriagem = ordens.filter((o) => o.status === 'aberta').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Ordens de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">
            {status ? (
              <span>
                Filtrando por:{' '}
                <span className="font-semibold text-primary">{STATUS_LABELS[status] ?? status}</span>
                {' · '}
                <a href="/ordens-servico" className="text-primary underline">
                  Ver todas
                </a>
              </span>
            ) : (
              <>
                {ordens.length} O.S. no sistema
                {aguardandoTriagem > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-scheduled text-primary">
                    {aguardandoTriagem} aguardando triagem
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <a
          href="/ordens-servico/nova"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Criar O.S.
        </a>
      </div>

      {/* Barra de filtros */}
      <OsFilterBar currentStatus={status} currentQ={q} />

      {ordens.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <ClipboardList size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma O.S. encontrada.</p>
          {status && (
            <a href="/ordens-servico" className="text-sm text-primary underline mt-2 block">
              Ver todas as O.S.
            </a>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Nº', 'Ambiente', 'Status', 'Origem', 'Técnico', 'Data', 'Itens', 'Ação'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-surface transition-colors align-top">
                  <td className="px-4 py-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                    OS-{os.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-900">
                    {os.ambiente?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={os.status} />
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {ORIGEM_LABEL[os.origem] ?? os.origem}
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {os.tecnico?.email ?? (
                      <span className="italic text-gray-400">Não atribuído</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-gray-600">
                    {os.itens?.length ?? 0}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col gap-2 items-end">
                      <TriarForm
                        osId={os.id}
                        status={os.status}
                        tecnicos={tecnicos}
                      />
                      <FinanceiroForm
                        osId={os.id}
                        valorMaoObra={os.valorMaoObra ?? null}
                        valorPecas={os.valorPecas ?? null}
                      />
                      <a
                        href={`/ordens-servico/${os.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        title="Imprimir / PDF"
                      >
                        <FileText size={11} />
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
