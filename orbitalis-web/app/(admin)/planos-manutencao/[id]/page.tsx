import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { CalendarClock, CheckCircle, XCircle, Clock, ClipboardList, Pencil } from 'lucide-react'
import { gerarOsPlano } from '../actions'

type Props = { params: Promise<{ id: string }> }

type OsResumo = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
}

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  ultimaGeracao: string | null
  dataFim: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  }
  tecnico: { id: string; email: string } | null
  modeloChecklist: { id: string; nome: string } | null
  ordensServico: OsResumo[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  aberta:        { label: 'Aberta',        cls: 'bg-blue-100   text-blue-700'   },
  agendada:      { label: 'Agendada',      cls: 'bg-yellow-100 text-yellow-700' },
  em_andamento:  { label: 'Em andamento',  cls: 'bg-orange-100 text-orange-700' },
  concluida:     { label: 'Concluída',     cls: 'bg-green-100  text-green-700'  },
  cancelada:     { label: 'Cancelada',     cls: 'bg-red-100    text-red-700'    },
}

export default async function DetalhePlanoPage({ params }: Props) {
  const { id } = await params

  let plano: Plano
  try {
    plano = await api.get<Plano>(`/planos-manutencao/${id}`)
  } catch {
    notFound()
  }

  const cliente = plano.ambiente?.cliente?.nomeFantasia ?? plano.ambiente?.cliente?.razaoSocial ?? '—'
  const freq = plano.frequenciaDias === 30  ? 'Mensal'
             : plano.frequenciaDias === 60  ? 'Bimestral'
             : plano.frequenciaDias === 90  ? 'Trimestral'
             : plano.frequenciaDias === 180 ? 'Semestral'
             : plano.frequenciaDias === 365 ? 'Anual'
             : `A cada ${plano.frequenciaDias} dias`

  const os = plano.ordensServico ?? []
  const proxData = new Date(plano.proximaGeracao)
  const agora    = new Date()
  const elegivel = plano.ativo && proxData <= agora

  const dispararAction = gerarOsPlano.bind(null, id)

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/planos-manutencao" className="text-gray-500 hover:text-primary transition-colors">
          ← Planos Preventivos
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{plano.ambiente?.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{plano.ambiente?.nome}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {cliente} · {plano.ambiente?.localizacaoInterna}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {plano.ativo
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-action bg-action/10 px-2.5 py-1 rounded-full"><CheckCircle size={12} />Ativo</span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full"><XCircle size={12} />Inativo</span>
            }
            <a
              href={`/planos-manutencao/${id}/editar`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <Pencil size={12} />Editar
            </a>
          </div>
        </div>

        {/* Metadados em grade */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Frequência</p>
            <p className="text-sm font-semibold text-gray-800">{freq}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Técnico</p>
            <p className="text-sm font-semibold text-gray-800">
              {plano.tecnico?.email ?? <span className="text-gray-400 font-normal italic">Não atribuído</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Checklist</p>
            <p className="text-sm font-semibold text-gray-800">
              {plano.modeloChecklist
                ? <a href={`/checklists/${plano.modeloChecklist.id}/editar`} className="text-primary hover:underline">{plano.modeloChecklist.nome}</a>
                : <span className="text-gray-400 font-normal italic">Sem checklist</span>
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Próxima Geração</p>
            <p className={`text-sm font-semibold ${elegivel ? 'text-action' : 'text-gray-800'}`}>
              {proxData.toLocaleDateString('pt-BR')}
              {elegivel && <span className="ml-1 text-[10px] bg-action/10 text-action px-1.5 py-0.5 rounded-full">pronta p/ gerar</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Última Geração</p>
            <p className="text-sm font-semibold text-gray-800">
              {plano.ultimaGeracao
                ? new Date(plano.ultimaGeracao).toLocaleDateString('pt-BR')
                : <span className="text-gray-400 font-normal italic">Nenhuma</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Data Limite</p>
            <p className="text-sm font-semibold text-gray-800">
              {plano.dataFim
                ? new Date(plano.dataFim).toLocaleDateString('pt-BR')
                : <span className="text-gray-400 font-normal italic">Sem limite</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Histórico de O.S. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            Ordens de Serviço Geradas
            <span className="text-xs font-normal text-gray-400">({os.length})</span>
          </h2>

          {/* Botão gerar O.S. restantes */}
          {(!plano.dataFim || new Date(plano.proximaGeracao) <= new Date(plano.dataFim)) && (
            <form action={dispararAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action text-white rounded-lg hover:bg-action/90 transition-colors"
                title="Gera todas as O.S. restantes deste plano imediatamente"
              >
                ⚡ Gerar agora
              </button>
            </form>
          )}
        </div>

        {os.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
            <Clock size={32} className="mx-auto text-primary/20 mb-3" />
            <p className="text-sm text-gray-500">Nenhuma O.S. gerada ainda.</p>
            {elegivel ? (
              <p className="text-xs text-action mt-1 font-medium">
                Este plano está elegível — clique em "Gerar agora" para criar a primeira O.S.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                O cron gera automaticamente quando a data de próxima geração chegar ({proxData.toLocaleDateString('pt-BR')}).
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {['Data de Agendamento', 'Status', 'Conclusão', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {os.map((o) => {
                  const st = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={o.id} className="hover:bg-surface transition-colors">
                      <td className="px-5 py-3 text-gray-700">
                        {new Date(o.dataAgendamento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {o.dataConclusao ? new Date(o.dataConclusao).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={`/ordens-servico?id=${o.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Ver O.S.
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
