import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { CalendarClock, CheckCircle, XCircle, Clock, ClipboardList, Pencil, FileText, Building2, Cpu } from 'lucide-react'
import { gerarOsPlano } from '../actions'

type Props = { params: Promise<{ id: string }> }

type OsResumo = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
  ambienteId: string
}

type EquipConfig = {
  equipamentoId: string
  equipamento: {
    id: string
    nome: string
    marca: string
    modelo: string | null
    tipoEquipamento: string
    numeroSerie: string | null
    ambienteId: string
    ambiente: { id: string; nome: string; localizacaoInterna: string }
  }
  modeloChecklist: { id: string; nome: string } | null
}

type Plano = {
  id: string
  frequenciaDias: number
  ativo: boolean
  proximaGeracao: string
  ultimaGeracao: string | null
  dataFim: string | null
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  tecnico: { id: string; email: string; nome: string | null } | null
  equipamentosConfig: EquipConfig[]
  ordensServico: OsResumo[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  aberta:       { label: 'Aberta',       cls: 'bg-blue-100   text-blue-700'   },
  agendada:     { label: 'Agendada',     cls: 'bg-yellow-100 text-yellow-700' },
  em_andamento: { label: 'Em andamento', cls: 'bg-orange-100 text-orange-700' },
  concluida:    { label: 'Concluída',    cls: 'bg-green-100  text-green-700'  },
  cancelada:    { label: 'Cancelada',    cls: 'bg-red-100    text-red-700'    },
}

const FREQ: Record<number, string> = {
  30: 'Mensal', 60: 'Bimestral', 90: 'Trimestral', 180: 'Semestral', 365: 'Anual',
}

export default async function DetalhePlanoPage({ params }: Props) {
  const { id } = await params

  let plano: Plano
  try {
    plano = await api.get<Plano>(`/planos-manutencao/${id}`)
  } catch {
    notFound()
  }

  const clienteLabel = plano.cliente?.nomeFantasia ?? plano.cliente?.razaoSocial ?? '—'
  const freq = FREQ[plano.frequenciaDias] ?? `A cada ${plano.frequenciaDias} dias`

  const os = plano.ordensServico ?? []
  const proxData = new Date(plano.proximaGeracao)
  const agora = new Date()
  const elegivel = plano.ativo && proxData <= agora

  const dispararAction = gerarOsPlano.bind(null, id)

  // Agrupa equipamentos por ambiente
  const ambienteMap = new Map<string, { ambiente: EquipConfig['equipamento']['ambiente']; configs: EquipConfig[] }>()
  for (const config of plano.equipamentosConfig) {
    const amb = config.equipamento.ambiente
    if (!ambienteMap.has(amb.id)) ambienteMap.set(amb.id, { ambiente: amb, configs: [] })
    ambienteMap.get(amb.id)!.configs.push(config)
  }
  const ambienteGroups = Array.from(ambienteMap.values())

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/planos-manutencao" className="text-gray-500 hover:text-primary transition-colors">
          ← Planos Preventivos
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{clienteLabel}</span>
      </div>

      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{clienteLabel}</h1>
              {plano.cliente?.nomeFantasia && (
                <p className="text-sm text-gray-400">{plano.cliente.razaoSocial}</p>
              )}
              <p className="text-sm text-gray-400 mt-0.5">
                {plano.equipamentosConfig.length} equipamento(s) · {ambienteGroups.length} ambiente(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {plano.ativo
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-action bg-action/10 px-2.5 py-1 rounded-full"><CheckCircle size={12} />Ativo</span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full"><XCircle size={12} />Inativo</span>
            }
            <a href={`/planos-manutencao/${id}/pmoc`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
              <FileText size={12} />PMOC
            </a>
            <a href={`/planos-manutencao/${id}/editar`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
              <Pencil size={12} />Editar
            </a>
          </div>
        </div>

        {/* Metadados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Frequência</p>
            <p className="text-sm font-semibold text-gray-800">{freq}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Técnico</p>
            <p className="text-sm font-semibold text-gray-800">
              {plano.tecnico ? (plano.tecnico.nome ?? plano.tecnico.email)
                : <span className="text-gray-400 font-normal italic">Não atribuído</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Próxima Geração</p>
            <p className={`text-sm font-semibold ${elegivel ? 'text-action' : 'text-gray-800'}`}>
              {proxData.toLocaleDateString('pt-BR')}
              {elegivel && <span className="ml-1 text-[10px] bg-action/10 text-action px-1.5 py-0.5 rounded-full">pronta</span>}
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

      {/* Ambientes e equipamentos */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-3 border-b border-border bg-surface flex items-center gap-2">
          <Cpu size={14} className="text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Equipamentos Cobertos pelo Plano</h2>
        </div>

        {ambienteGroups.length === 0 ? (
          <p className="text-sm text-gray-400 italic p-6">Nenhum equipamento vinculado.</p>
        ) : (
          ambienteGroups.map(({ ambiente, configs }) => (
            <div key={ambiente.id}>
              <div className="px-5 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
                <Building2 size={12} className="text-primary/70 shrink-0" />
                <span className="text-xs font-bold text-primary">{ambiente.nome}</span>
                <span className="text-xs text-gray-400">{ambiente.localizacaoInterna}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {configs.map((c) => (
                    <tr key={c.equipamentoId} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 w-8 text-gray-400 text-xs">
                        <Cpu size={13} />
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{c.equipamento.nome}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{c.equipamento.tipoEquipamento}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {[c.equipamento.marca, c.equipamento.modelo].filter(Boolean).join(' ')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.modeloChecklist ? (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-medium">
                            {c.modeloChecklist.nome}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sem checklist</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* O.S. Geradas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            Ordens de Serviço Geradas
            <span className="text-xs font-normal text-gray-400">({os.length})</span>
          </h2>
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
                Este plano está elegível — clique em "Gerar agora" para criar as primeiras O.S.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                O cron gera automaticamente quando a data chegar ({proxData.toLocaleDateString('pt-BR')}).
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {['Data Agendamento', 'Ambiente', 'Status', 'Conclusão', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {os.map((o) => {
                  const st = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' }
                  const amb = plano.equipamentosConfig.find(
                    (c) => c.equipamento.ambienteId === o.ambienteId
                  )?.equipamento.ambiente
                  return (
                    <tr key={o.id} className="hover:bg-surface transition-colors">
                      <td className="px-5 py-3 text-gray-700">
                        {new Date(o.dataAgendamento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{amb?.nome ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {o.dataConclusao ? new Date(o.dataConclusao).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a href={`/ordens-servico?id=${o.id}`} className="text-xs font-semibold text-primary hover:underline">
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
