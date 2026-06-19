import { Suspense } from 'react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { OsFilterBar } from '@/components/ui/os-filter-bar'
import { OsPagination } from '@/components/ui/os-pagination'
import { OsActionsMenu } from '@/components/ui/os-actions-menu'
import { ClipboardList, CalendarDays } from 'lucide-react'

type OrdemServico = {
  id: string
  numero: number | null
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
  observacoesGerais: string | null
  horaInicio: string | null
  horaFim: string | null
  ambiente: {
    nome: string
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  }
  tecnico: { id: string; email: string; nome: string | null } | null
  tipoServico: { sigla: string; nome: string; corHex: string } | null
  itens: { id: string; statusItem: string }[]
  valorMaoObra: number | null
  valorPecas: number | null
}

type Tecnico = { id: string; email: string; nome: string | null }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

type ApiResponse = {
  data: OrdemServico[]
  total: number
  page: number
  perPage: number
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente:        'Portal Cliente',
}

type Props = {
  searchParams: Promise<{
    status?: string
    q?: string
    tecnicoId?: string
    clienteId?: string
    dataInicio?: string
    dataFim?: string
    atrasadas?: string
    orderBy?: string
    page?: string
  }>
}

export default async function OrdensServicoPage({ searchParams }: Props) {
  const sp = await searchParams
  const { status, q, tecnicoId, clienteId, dataInicio, dataFim, atrasadas, orderBy, page } = sp

  const qs = new URLSearchParams()
  if (status)     qs.set('status', status)
  if (q)          qs.set('q', q)
  if (tecnicoId)  qs.set('tecnicoId', tecnicoId)
  if (clienteId)  qs.set('clienteId', clienteId)
  if (dataInicio) qs.set('dataInicio', dataInicio)
  if (dataFim)    qs.set('dataFim', dataFim)
  if (atrasadas)  qs.set('atrasadas', atrasadas)
  if (orderBy)    qs.set('orderBy', orderBy)
  if (page)       qs.set('page', page)
  qs.set('perPage', '20')

  const [result, tecnicosRes, clientesRes] = await Promise.all([
    api.get<ApiResponse>(`/ordens-servico?${qs.toString()}`).catch(() => ({
      data: [] as OrdemServico[], total: 0, page: 1, perPage: 20,
    })),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Cliente[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as Cliente[] })),
  ])

  const ordens      = result.data
  const currentPage = result.page
  const total       = result.total
  const perPage     = result.perPage
  const tecnicos    = tecnicosRes.data
  const clientes    = clientesRes.data

  const aguardandoTriagem = ordens.filter((o) => o.status === 'aberta').length
  const isFiltered = !!(status || q || tecnicoId || clienteId || dataInicio || dataFim || atrasadas)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ordens de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isFiltered ? (
              <span>
                {total} O.S. encontrada{total !== 1 ? 's' : ''}{' '}
                <a href="/ordens-servico" className="text-primary underline">· Limpar filtros</a>
              </span>
            ) : (
              <>
                {total} O.S. no sistema
                {aguardandoTriagem > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-scheduled text-primary">
                    {aguardandoTriagem} aguardando triagem
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/ordens-servico/agenda"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-semibold text-gray-600 rounded-lg hover:bg-surface transition-colors"
          >
            <CalendarDays size={14} />
            Agenda
          </a>
          <a
            href="/ordens-servico/nova"
            className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
          >
            + Criar O.S.
          </a>
        </div>
      </div>

      <OsFilterBar
        currentStatus={status}
        currentQ={q}
        currentTecnicoId={tecnicoId}
        currentClienteId={clienteId}
        currentDataInicio={dataInicio}
        currentDataFim={dataFim}
        currentOrderBy={orderBy}
        atrasadas={atrasadas === '1' || atrasadas === 'true'}
        tecnicos={tecnicos}
        clientes={clientes}
      />

      {ordens.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <p className="text-gray-400 text-sm">Nenhuma O.S. encontrada.</p>
          {isFiltered && (
            <a href="/ordens-servico" className="text-sm text-primary underline mt-2 block">
              Ver todas as O.S.
            </a>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Nº', 'Cliente / Ambiente', 'Status', 'Origem', 'Técnico', 'Data', 'Itens', 'Ação'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordens.map((os) => {
                const cliente = os.ambiente?.cliente
                const clienteNome = cliente?.nomeFantasia ?? cliente?.razaoSocial
                return (
                  <tr key={os.id} className="hover:bg-surface transition-colors align-middle">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {os.tipoServico ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-white text-xs font-bold"
                          style={{ backgroundColor: os.tipoServico.corHex }}
                        >
                          {os.tipoServico.sigla}-{os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 4).toUpperCase()}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-gray-500 font-semibold">
                          OS-{os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{os.ambiente?.nome ?? '—'}</div>
                      {clienteNome && (
                        <div className="text-xs text-gray-400 mt-0.5">{clienteNome}</div>
                      )}
                      {os.observacoesGerais && (
                        <div className="text-xs text-gray-400 mt-1 max-w-[220px] truncate italic" title={os.observacoesGerais}>
                          {os.observacoesGerais}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={os.status} />
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {ORIGEM_LABEL[os.origem] ?? os.origem}
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {os.tecnico ? (
                        <span>{os.tecnico.nome ?? os.tecnico.email}</span>
                      ) : (
                        <span className="italic text-gray-400">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-gray-600">
                      {os.itens?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <OsActionsMenu
                        osId={os.id}
                        status={os.status}
                        tecnicos={tecnicos}
                        valorMaoObra={os.valorMaoObra ?? null}
                        valorPecas={os.valorPecas ?? null}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Suspense>
            <OsPagination page={currentPage} total={total} perPage={perPage} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
