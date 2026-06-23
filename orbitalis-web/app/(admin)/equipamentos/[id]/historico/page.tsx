import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { History, Wrench, TrendingUp, Calendar, Tag, ClipboardList, AlertTriangle, Activity, CheckCircle, XCircle } from 'lucide-react'
import { LgmvUpload } from '@/components/ui/lgmv-upload'

type Props = { params: Promise<{ id: string }> }

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  codigoQr: string
  numeroSerie: string | null
  dataInstalacao: string | null
  condicao: string | null
  diagnosticoInicial: string | null
  valorAquisicao: number | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  }
}

type OsResumo = {
  id: string
  tipo: 'preventiva' | 'corretiva'
  status: string
  origem: string
  dataAgendamento: string
  dataConclusao: string | null
  valorMaoObra: number | null
  valorPecas: number | null
  observacoesGerais: string | null
}

type Item = {
  id: string
  statusItem: string
  ordemServico: OsResumo
}

type Historico = { equipamento: Equipamento; itens: Item[]; isReincidente: boolean; corretivasRecentes: number }

type DiagnosticoResumido = {
  id: string
  criadoEm: string
  arquivoIduNome: string | null
  arquivoOduNome: string | null
  relatorio: { status: 'normal' | 'atencao' | 'critico'; modo: string; duracao: string }
  os: { id: string; numero: number } | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  aberta:       { label: 'Aberta',       cls: 'bg-blue-100   text-blue-700'   },
  agendada:     { label: 'Agendada',     cls: 'bg-yellow-100 text-yellow-700' },
  em_andamento: { label: 'Em andamento', cls: 'bg-orange-100 text-orange-700' },
  concluida:    { label: 'Concluída',    cls: 'bg-green-100  text-green-700'  },
  cancelada:    { label: 'Cancelada',    cls: 'bg-red-100    text-red-700'    },
}

const ORIGEM: Record<string, string> = {
  manual_admin: 'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente: 'Portal',
}

function fmtBRL(v: number | null) {
  if (v === null || v === undefined) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default async function HistoricoEquipamentoPage({ params }: Props) {
  const { id } = await params

  let hist: Historico
  let diagnosticos: DiagnosticoResumido[] = []
  try {
    [hist] = await Promise.all([
      api.get<Historico>(`/equipamentos/${id}/historico`),
    ])
    diagnosticos = await api.get<DiagnosticoResumido[]>(`/diagnosticos-lgmv/equipamento/${id}`).catch(() => [])
  } catch {
    notFound()
  }

  const { equipamento: eq, itens, isReincidente, corretivasRecentes } = hist
  const cliente = eq.ambiente?.cliente?.nomeFantasia ?? eq.ambiente?.cliente?.razaoSocial ?? '—'

  // Custo total acumulado (somente O.S. concluídas)
  const osConcluidas = itens.filter((i) => i.ordemServico.status === 'concluida')
  const totalMaoObra = osConcluidas.reduce((s, i) => s + (Number(i.ordemServico.valorMaoObra) || 0), 0)
  const totalPecas   = osConcluidas.reduce((s, i) => s + (Number(i.ordemServico.valorPecas)   || 0), 0)
  const totalGasto   = totalMaoObra + totalPecas + (Number(eq.valorAquisicao) || 0)

  // Custo acumulado ao longo do tempo (para exibição linha a linha)
  let acumulado = Number(eq.valorAquisicao) || 0
  const itensComAcum = [...itens].reverse().map((item) => {
    const custo = (Number(item.ordemServico.valorMaoObra) || 0) + (Number(item.ordemServico.valorPecas) || 0)
    if (item.ordemServico.status === 'concluida') acumulado += custo
    return { ...item, custo, acumulado }
  }).reverse()

  return (
    <div className="max-w-4xl">
      {/* Banner reincidente */}
      {isReincidente && (
        <div className="flex items-center gap-3 mb-5 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">Equipamento Reincidente</p>
            <p className="text-xs text-red-500 mt-0.5">
              {corretivasRecentes} O.S. corretivas nos últimos 6 meses — recomenda-se revisão ou substituição.
            </p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/equipamentos" className="text-gray-500 hover:text-primary transition-colors">Equipamentos</a>
        <span className="text-gray-300">/</span>
        <a href={`/equipamentos/${id}/editar`} className="text-gray-500 hover:text-primary transition-colors">{eq.nome}</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Histórico</span>
      </div>

      {/* Cabeçalho do equipamento */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Wrench size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{eq.nome}</h1>
                {isReincidente && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    <AlertTriangle size={10} /> Reincidente
                  </span>
                )}
              </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {eq.marca}{eq.modelo ? ` ${eq.modelo}` : ''} · {eq.tipoEquipamento}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{cliente} · {eq.ambiente?.nome}</p>
          </div>
          <a
            href={`/equipamentos/${id}/editar`}
            className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            Editar
          </a>
        </div>

        {/* Dados de ciclo de vida */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Calendar size={10} />Instalação</p>
            <p className="text-sm font-semibold text-gray-800">{fmtDate(eq.dataInstalacao)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Tag size={10} />Condição</p>
            <p className="text-sm font-semibold text-gray-800 capitalize">{eq.condicao ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Valor de Aquisição</p>
            <p className="text-sm font-semibold text-gray-800">{fmtBRL(eq.valorAquisicao) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><ClipboardList size={10} />O.S. realizadas</p>
            <p className="text-sm font-semibold text-gray-800">{osConcluidas.length} / {itens.length}</p>
          </div>
        </div>

        {eq.diagnosticoInicial && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400 mb-1">Diagnóstico Inicial</p>
            <p className="text-sm text-gray-700">{eq.diagnosticoInicial}</p>
          </div>
        )}
      </div>

      {/* Cards de custo total */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Mão de Obra (total)</p>
          <p className="text-lg font-bold text-gray-900">{fmtBRL(totalMaoObra) ?? 'R$ 0,00'}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Peças (total)</p>
          <p className="text-lg font-bold text-gray-900">{fmtBRL(totalPecas) ?? 'R$ 0,00'}</p>
        </div>
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 shadow-sm">
          <p className="text-xs text-primary/70 mb-1 flex items-center gap-1"><TrendingUp size={11} />Custo Total (acq. + serviços)</p>
          <p className="text-lg font-bold text-primary">{fmtBRL(totalGasto) ?? 'R$ 0,00'}</p>
        </div>
      </div>

      {/* Histórico linha a linha */}
      <div>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
          <History size={16} className="text-primary" />
          Linha do Tempo
          <span className="text-xs font-normal text-gray-400">({itens.length} registro{itens.length !== 1 ? 's' : ''})</span>
        </h2>

        {itens.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
            <History size={32} className="mx-auto text-primary/20 mb-3" />
            <p className="text-sm text-gray-500">Nenhuma O.S. registrada para este equipamento.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Linha de aquisição */}
            {eq.valorAquisicao !== null && (
              <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border bg-surface">
                <div className="text-xs text-gray-400 w-24 shrink-0">{fmtDate(eq.dataInstalacao)}</div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-600">Aquisição do Equipamento</span>
                  {eq.condicao && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">{eq.condicao}</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Investimento inicial</p>
                  <p className="text-sm font-bold text-gray-700">{fmtBRL(eq.valorAquisicao)}</p>
                </div>
              </div>
            )}

            {/* O.S. em ordem cronológica */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {['Data', 'O.S.', 'Tipo', 'Status', 'Origem', 'M.O.', 'Peças', 'Total O.S.', 'Acumulado'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itensComAcum.map((item) => {
                  const os = item.ordemServico
                  const st = STATUS[os.status] ?? { label: os.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={item.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(os.dataAgendamento)}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/ordens-servico/${os.id}/pdf`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          OS-{os.id.slice(0, 6).toUpperCase()}
                        </a>
                        {os.observacoesGerais && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate" title={os.observacoesGerais}>
                            {os.observacoesGerais}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          os.tipo === 'corretiva'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {os.tipo === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {ORIGEM[os.origem] ?? os.origem}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {fmtBRL(os.valorMaoObra) ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {fmtBRL(os.valorPecas) ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                        {os.status === 'concluida' && item.custo > 0 ? fmtBRL(item.custo) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold text-primary">
                          {os.status === 'concluida' ? fmtBRL(item.acumulado) : <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Diagnósticos LGMV ── */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Activity size={16} className="text-primary" />
          Diagnósticos LGMV
          <span className="text-xs font-normal text-gray-400">({diagnosticos.length} registro{diagnosticos.length !== 1 ? 's' : ''})</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <LgmvUpload equipamentoId={id} equipamentoNome={eq.nome} />
        </div>

        {diagnosticos.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {['Data', 'Status', 'Modo', 'Duração', 'Arquivos', 'O.S.', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diagnosticos.map((d) => {
                  const st = d.relatorio.status
                  const StatusIcon = st === 'critico' ? XCircle : st === 'atencao' ? AlertTriangle : CheckCircle
                  const stCls = st === 'critico' ? 'text-red-500' : st === 'atencao' ? 'text-yellow-500' : 'text-emerald-500'
                  const stLabel = st === 'critico' ? 'Crítico' : st === 'atencao' ? 'Atenção' : 'Normal'
                  return (
                    <tr key={d.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.criadoEm).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-semibold ${stCls}`}>
                          <StatusIcon size={12} />{stLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.relatorio.modo}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.relatorio.duracao}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {[d.arquivoIduNome, d.arquivoOduNome].filter(Boolean).join(' + ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {d.os ? (
                          <a href={`/ordens-servico/${d.os.id}`} className="text-primary hover:underline font-mono">
                            OS-{String(d.os.numero).padStart(4, '0')}
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/equipamentos/${id}/diagnosticos/${d.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Ver relatório
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
