import { api } from '@/lib/api'
import { OsFilterBar } from '@/components/ui/os-filter-bar'
import { OsTable } from './os-table'
import { CalendarDays } from 'lucide-react'

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
        <OsTable
          ordens={ordens}
          tecnicos={tecnicos}
          currentPage={currentPage}
          total={total}
          perPage={perPage}
        />
      )}
    </div>
  )
}
