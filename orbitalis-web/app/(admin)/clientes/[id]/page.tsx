import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Building2, Cpu, ChevronRight, DollarSign, ClipboardList,
  CalendarClock, FileText,
  Clock, RefreshCw, ShieldCheck,
} from 'lucide-react'

type Equipamento = { id: string; nome: string; tipoEquipamento: string; marca: string; modelo: string | null; numeroSerie: string | null }
type Ambiente = { id: string; nome: string; localizacaoInterna: string; metrosQuadrados: number; capacidadeTermica: string; equipamentos: Equipamento[] }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null; documento: string | null; endereco: string; telefone: string | null; celular: string | null; email: string | null; cidade: string | null; uf: string | null; ambientes: Ambiente[] }
type Contrato = { id: string; descricao: string; valorMensal: number | null; vigenciaInicio: string; vigenciaFim: string; numOsIncluidas: number | null; ativo: boolean }
type OsResumo = { id: string; numero: number | null; status: string; tipo: string; dataAgendamento: string; dataConclusao: string | null; ambiente: { nome: string }; tecnico: { nome: string | null; email: string } | null }
type Dashboard = {
  porStatus: Record<string, number>
  custoTotalGeral: number
  osDoMes: number
  contrato: Contrato | null
  proximaOs: { id: string; dataAgendamento: string; tipo: string; ambiente: { nome: string } } | null
  ultimasOs: OsResumo[]
  totalAmbientes: number
  totalEquipamentos: number
}

type MetricaEquip = {
  id: string
  totalCorretivas: number
  mttrHoras: number | null
  mtbfDias: number | null
}

type Config = { mttrLimiteHoras: number | null; mtbfLimiteDias: number | null; custoHoraParada: number | null }

type Props = { params: Promise<{ id: string }> }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params

  let cliente: Cliente | undefined
  let dash: Dashboard | undefined
  let metricas: MetricaEquip[] = []
  let config: Config = { mttrLimiteHoras: null, mtbfLimiteDias: null, custoHoraParada: null }
  try {
    ;[cliente, dash] = await Promise.all([
      api.get<Cliente>(`/clientes/${id}`),
      api.get<Dashboard>(`/clientes/${id}/dashboard`),
    ])
    ;[metricas, config] = await Promise.all([
      api.get<MetricaEquip[]>(`/equipamentos/metricas-confiabilidade?clienteId=${id}`).catch(() => []),
      api.get<Config>('/configuracao').catch(() => ({ mttrLimiteHoras: null, mtbfLimiteDias: null, custoHoraParada: null })),
    ])
  } catch {
    /* empty */
  }
  if (!cliente || !dash) notFound()

  // ── Métricas de confiabilidade da frota do cliente ──
  const mttrLimite  = config.mttrLimiteHoras ?? 48
  const mtbfLimite  = config.mtbfLimiteDias  ?? 90
  const custoPorH   = config.custoHoraParada ? Number(config.custoHoraParada) : null
  const periodoHoras = 365 * 24 // 12 meses em horas por equipamento
  const nEquip = metricas.length

  // Total de horas de reparo = soma de (mttrHoras * totalCorretivas) por equipamento
  const horasReparo = metricas.reduce((s, m) =>
    s + (m.mttrHoras !== null ? m.mttrHoras * m.totalCorretivas : 0), 0)
  // Total de horas-frota disponíveis
  const horasFrota = nEquip * periodoHoras
  const disponibilidade = horasFrota > 0
    ? Math.max(0, Math.min(100, +((horasFrota - horasReparo) / horasFrota * 100).toFixed(1)))
    : null

  // MTTR médio ponderado por número de corretivas
  const totalCorretivas = metricas.reduce((s, m) => s + m.totalCorretivas, 0)
  const mttrMedioFrota = totalCorretivas > 0
    ? +(metricas.reduce((s, m) => s + (m.mttrHoras ?? 0) * m.totalCorretivas, 0) / totalCorretivas).toFixed(1)
    : null

  // MTBF médio simples dos equipamentos que têm dado
  const comMtbf = metricas.filter((m) => m.mtbfDias !== null)
  const mtbfMedioFrota = comMtbf.length > 0
    ? +(comMtbf.reduce((s, m) => s + m.mtbfDias!, 0) / comMtbf.length).toFixed(1)
    : null

  function semMttr(v: number | null) {
    if (v === null) return null
    if (v <= mttrLimite / 2) return { cls: 'bg-green-100 text-green-800', dot: 'bg-green-400' }
    if (v <= mttrLimite)     return { cls: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' }
    return { cls: 'bg-red-100 text-red-800', dot: 'bg-red-400' }
  }
  function semMtbf(v: number | null) {
    if (v === null) return null
    if (v >= mtbfLimite)     return { cls: 'bg-green-100 text-green-800', dot: 'bg-green-400' }
    if (v >= mtbfLimite / 2) return { cls: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' }
    return { cls: 'bg-red-100 text-red-800', dot: 'bg-red-400' }
  }

  const totalOs = Object.values(dash.porStatus).reduce((s, n) => s + n, 0)
  const contratoAtivo = dash.contrato
  const diasVigencia = contratoAtivo
    ? Math.ceil((new Date(contratoAtivo.vigenciaFim).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/clientes" className="text-gray-500 hover:text-primary transition-colors">← Clientes</a>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-700 font-medium">{cliente.nomeFantasia ?? cliente.razaoSocial}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{cliente.razaoSocial}</h1>
          {cliente.nomeFantasia && <p className="text-gray-400 text-sm mt-0.5">{cliente.nomeFantasia}</p>}
          <p className="text-gray-500 text-sm mt-1 font-mono">
            {cliente.documento ?? <span className="font-sans text-gray-400">Sem CPF/CNPJ — <a href={`/clientes/${id}/editar`} className="text-primary hover:underline">completar</a></span>}
          </p>
          {(cliente.endereco || cliente.cidade) && (
            <p className="text-gray-500 text-xs mt-0.5">{cliente.endereco || `${cliente.cidade}${cliente.uf ? `/${cliente.uf}` : ''}`}</p>
          )}
          {(cliente.telefone || cliente.celular || cliente.email) && (
            <p className="text-gray-500 text-xs mt-0.5">
              {[cliente.telefone, cliente.celular, cliente.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/contratos/novo?clienteId=${id}`}
            className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            + Contrato
          </a>
          <a href={`/clientes/${id}/editar`}
            className="px-3 py-2 text-xs font-semibold border border-border text-gray-600 rounded-lg hover:bg-surface transition-colors">
            Editar
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Total de O.S.</p>
          <p className="text-2xl font-bold text-primary">{totalOs}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={10} /> Custo Total</p>
          <p className="text-2xl font-bold text-gray-900">{fmtBRL(dash.custoTotalGeral)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">O.S. este mês</p>
          <p className="text-2xl font-bold text-gray-900">{dash.osDoMes}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${
          diasVigencia != null && diasVigencia <= 30 ? 'bg-red-50 border-red-200' :
          diasVigencia != null && diasVigencia <= 60 ? 'bg-yellow-50 border-yellow-200' :
          'bg-white border-border'
        }`}>
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><FileText size={10} /> Contrato</p>
          {contratoAtivo ? (
            <>
              <p className={`text-sm font-bold ${diasVigencia! <= 30 ? 'text-red-600' : diasVigencia! <= 60 ? 'text-yellow-700' : 'text-gray-800'}`}>
                {diasVigencia! > 0 ? `${diasVigencia}d restantes` : 'Vencido'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">até {fmtDate(contratoAtivo.vigenciaFim)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Sem contrato</p>
          )}
        </div>
      </div>

      {/* Status das O.S. */}
      <div className="bg-white border border-border rounded-lg overflow-hidden mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
          {[
            { key: 'aberta', label: 'Abertas', dot: 'bg-sky-500' },
            { key: 'agendada', label: 'Agendadas', dot: 'bg-gray-400' },
            { key: 'em_andamento', label: 'Em andamento', dot: 'bg-amber-500' },
            { key: 'concluida', label: 'Concluídas', dot: 'bg-emerald-500' },
            { key: 'cancelada', label: 'Canceladas', dot: 'bg-red-400' },
          ].map(({ key, label, dot }) => (
            <a key={key} href={`/ordens-servico?clienteId=${id}&status=${key}`} className="bg-white px-4 py-3 hover:bg-surface transition-colors">
              <p className="text-sm text-gray-500 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${dot}`} />{label}</p>
              <p className="text-xl font-semibold tabular-nums text-gray-900 mt-0.5">{dash.porStatus[key] ?? 0}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Confiabilidade da frota ── */}
      {nEquip > 0 && (
        <div className="bg-white rounded-lg border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShieldCheck size={15} className="text-primary" /> Confiabilidade da Frota
              <span className="text-xs font-normal text-gray-400">— últimos 12 meses · {nEquip} equipamento{nEquip !== 1 ? 's' : ''}</span>
            </p>
            <a href={`/equipamentos/confiabilidade`} className="text-xs text-primary font-semibold hover:underline">
              Ver por equipamento →
            </a>
          </div>

          {/* Barra de disponibilidade */}
          {disponibilidade !== null && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                  Funcionando
                </span>
                <span className="text-xs font-bold text-gray-800">{disponibilidade}%</span>
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  {(100 - disponibilidade).toFixed(1)}%
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  Em reparo
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-400 rounded-l-full transition-all"
                  style={{ width: `${disponibilidade}%` }}
                />
                <div
                  className="h-full bg-red-400 rounded-r-full transition-all"
                  style={{ width: `${(100 - disponibilidade).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}

          {/* Métricas numéricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                <Clock size={10} /> MTTR médio
              </p>
              {mttrMedioFrota !== null ? (
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-gray-900">
                    {mttrMedioFrota < 24 ? `${mttrMedioFrota}h` : `${(mttrMedioFrota / 24).toFixed(1)}d`}
                  </p>
                  {semMttr(mttrMedioFrota) && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${semMttr(mttrMedioFrota)!.cls}`}>
                      {mttrMedioFrota <= mttrLimite / 2 ? 'Bom' : mttrMedioFrota <= mttrLimite ? 'Atenção' : 'Crítico'}
                    </span>
                  )}
                </div>
              ) : <p className="text-xl font-bold text-gray-300">—</p>}
              <p className="text-[10px] text-gray-400 mt-0.5">limite {mttrLimite}h</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                <RefreshCw size={10} /> MTBF médio
              </p>
              {mtbfMedioFrota !== null ? (
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-gray-900">{mtbfMedioFrota}d</p>
                  {semMtbf(mtbfMedioFrota) && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${semMtbf(mtbfMedioFrota)!.cls}`}>
                      {mtbfMedioFrota >= mtbfLimite ? 'Bom' : mtbfMedioFrota >= mtbfLimite / 2 ? 'Atenção' : 'Crítico'}
                    </span>
                  )}
                </div>
              ) : <p className="text-xl font-bold text-gray-300">—</p>}
              <p className="text-[10px] text-gray-400 mt-0.5">limite {mtbfLimite}d</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-0.5">Falhas (12m)</p>
              <p className="text-xl font-bold text-gray-900">{totalCorretivas}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">O.S. corretivas concluídas</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-0.5">Horas parado</p>
              <p className="text-xl font-bold text-gray-900">
                {horasReparo < 24
                  ? `${horasReparo.toFixed(1)}h`
                  : `${(horasReparo / 24).toFixed(1)}d`}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">tempo total em reparo</p>
            </div>
          </div>

          {/* Custo estimado de indisponibilidade */}
          {custoPorH !== null && horasReparo > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <DollarSign size={12} className="text-red-500" />
                Custo estimado de indisponibilidade ({horasReparo.toFixed(1)}h × {fmtBRL(custoPorH)}/h)
              </p>
              <p className="text-base font-bold text-red-600">
                {fmtBRL(horasReparo * custoPorH)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Próxima O.S. + Contrato detalhe */}
      {(dash.proximaOs || contratoAtivo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {dash.proximaOs && (
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><CalendarClock size={11} /> Próxima Manutenção</p>
              <p className="font-bold text-gray-800">{fmtDate(dash.proximaOs.dataAgendamento)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dash.proximaOs.ambiente.nome} · {dash.proximaOs.tipo === 'nao_se_aplica' ? 'não se aplica' : dash.proximaOs.tipo}</p>
              <a href={`/ordens-servico/${dash.proximaOs.id}`} className="text-xs text-primary font-semibold hover:underline mt-1 block">
                Ver O.S. →
              </a>
            </div>
          )}
          {contratoAtivo && (
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><FileText size={11} /> Contrato Ativo</p>
              <p className="font-bold text-gray-800 truncate">{contratoAtivo.descricao}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmtDate(contratoAtivo.vigenciaInicio)} → {fmtDate(contratoAtivo.vigenciaFim)}
                {contratoAtivo.valorMensal != null && ` · ${fmtBRL(Number(contratoAtivo.valorMensal))}/mês`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Últimas O.S. */}
      {dash.ultimasOs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList size={14} className="text-primary" /> Últimas O.S.
            </p>
            <a href={`/ordens-servico?clienteId=${id}`} className="text-xs text-primary font-semibold hover:underline">
              Ver todas
            </a>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nº</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Tipo</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Ambiente</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Técnico</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Agendamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dash.ultimasOs.map((os) => {
                const num = os.numero != null ? `OS-${String(os.numero).padStart(4,'0')}` : `OS-${os.id.slice(0,6).toUpperCase()}`
                return (
                  <tr key={os.id} className="hover:bg-surface/60">
                    <td className="px-5 py-2.5">
                      <a href={`/ordens-servico/${os.id}`} className="font-mono text-primary font-semibold hover:underline">{num}</a>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={os.status as any} /></td>
                    <td className="px-3 py-2.5 text-gray-500 capitalize">{os.tipo === 'nao_se_aplica' ? 'Não se aplica' : os.tipo}</td>
                    <td className="px-3 py-2.5 text-gray-600">{os.ambiente.nome}</td>
                    <td className="px-3 py-2.5 text-gray-500">{os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500">{fmtDate(os.dataAgendamento)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Árvore de ambientes */}
      <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Building2 size={15} className="text-primary" /> Ambientes e Equipamentos
      </h2>
      {cliente.ambientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum ambiente vinculado.</p>
          <a href={`/ambientes/novo?clienteId=${cliente.id}`} className="mt-3 inline-block text-sm text-primary font-semibold hover:underline">Criar ambiente</a>
        </div>
      ) : (
        <div className="space-y-4">
          {cliente.ambientes.map((amb) => (
            <div key={amb.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-primary" />
                  <span className="font-semibold text-gray-800 text-sm">{amb.nome}</span>
                  <span className="text-xs text-gray-400">· {amb.localizacaoInterna}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{Number(amb.metrosQuadrados).toFixed(0)} m²</span>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <Cpu size={11} />{amb.equipamentos.length} eq.
                  </span>
                  <a href={`/ambientes/${amb.id}/editar`} className="text-primary font-semibold hover:underline">Editar</a>
                </div>
              </div>
              {amb.equipamentos.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-400 italic">Nenhum equipamento.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Tipo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Marca/Modelo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Nº Série</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {amb.equipamentos.map((eq) => (
                      <tr key={eq.id} className="hover:bg-surface/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{eq.nome}</td>
                        <td className="px-4 py-2.5 text-gray-500">{eq.tipoEquipamento}</td>
                        <td className="px-4 py-2.5 text-gray-500">{eq.marca}{eq.modelo ? ` ${eq.modelo}` : ''}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono">{eq.numeroSerie ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <a href={`/equipamentos/${eq.id}/editar`} className="text-primary font-semibold hover:underline">Editar</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
