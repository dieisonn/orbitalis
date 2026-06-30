import { Suspense } from 'react'
import { api } from '@/lib/api'
import {
  CalendarClock, User, Wrench,
  ClipboardList, Clock, AlertTriangle, CheckCircle, XCircle,
  UserX, Cpu,
} from 'lucide-react'
import { OsChart } from '@/components/ui/os-chart'
import { YearSelector } from '@/components/ui/year-selector'

type TaxaConclusao = { concluidas: number; total: number; percentual: number }
type Tecnico = {
  tecnicoId: string; nome: string; email: string
  total: number; concluiuUltimoMes: number; atrasadas: number; aIniciar: number
}
type PlanoVencendo = { id: string; dataFim: string | null; ativo: boolean; cliente: string }
type PlanosVencendo = { vermelho: PlanoVencendo[]; amarelo: PlanoVencendo[]; verde: PlanoVencendo[] }
type TopEquip = { id: string; nome: string; tipoEquipamento: string; cliente: string; totalCorretivas: number }
type OsSemTecnico = { id: string; numero: number | null; tipo: string; dataAgendamento: string; cliente: string; ambiente: string }

type Painel = {
  porStatus: Record<string, number>
  atrasadas: number
  taxaConclusao: TaxaConclusao
  porTecnico: Tecnico[]
  porTipoEquipamento: Record<string, number>
  planosVencendo: PlanosVencendo
  custoTotalMes: number
  taxaCorretivas: number
  tempoMedioAtendimento: number | null
  totalConcluidasRecente: number
  topEquipamentos: TopEquip[]
  osSemTecnico: OsSemTecnico[]
}
type Historico = {
  mes: string; aberta: number; agendada: number
  em_andamento: number; concluida: number; cancelada: number
}


const STATUS = [
  { key: 'aberta',       label: 'Abertas',      icon: ClipboardList, bg: 'bg-blue-600',   text: 'text-white' },
  { key: 'agendada',     label: 'Agendadas',    icon: Clock,         bg: 'bg-orange-100', text: 'text-orange-700' },
  { key: 'em_andamento', label: 'Em andamento', icon: AlertTriangle, bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { key: 'concluida',    label: 'Concluídas',   icon: CheckCircle,   bg: 'bg-green-600',  text: 'text-white' },
  { key: 'cancelada',    label: 'Canceladas',   icon: XCircle,       bg: 'bg-red-600',    text: 'text-white' },
]

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtBRL(v: number) {
  if (v === 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

type Props = { searchParams: Promise<{ ano?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  const { ano: anoParam } = await searchParams
  const anoAtual = new Date().getFullYear()
  const ano = anoParam ? Math.max(2020, Math.min(anoAtual + 1, Number(anoParam))) : anoAtual

  const defaultPainel: Painel = {
    porStatus: {}, atrasadas: 0,
    taxaConclusao: { concluidas: 0, total: 0, percentual: 0 },
    porTecnico: [], porTipoEquipamento: {},
    planosVencendo: { vermelho: [], amarelo: [], verde: [] },
    custoTotalMes: 0, taxaCorretivas: 0,
    tempoMedioAtendimento: null, totalConcluidasRecente: 0,
    topEquipamentos: [], osSemTecnico: [],
  }

  const [painel, historico] = await Promise.all([
    api.get<Painel>('/ordens-servico/painel').catch(() => defaultPainel),
    api.get<Historico[]>(`/ordens-servico/historico?ano=${ano}`).catch(() => [] as Historico[]),
  ])

  const { porStatus, atrasadas, taxaConclusao, porTecnico, porTipoEquipamento, planosVencendo,
          custoTotalMes, taxaCorretivas, tempoMedioAtendimento, topEquipamentos, osSemTecnico } = painel

  const total = Object.values(porStatus).reduce<number>((s, n) => s + (n ?? 0), 0)
  const maxTecnico = porTecnico[0]?.total ?? 1

  const tiposOrdenados = Object.entries(porTipoEquipamento)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const todosPlanosVencendo = [
    ...planosVencendo.vermelho.map(p => ({ ...p, zone: 'red' as const })),
    ...planosVencendo.amarelo.map(p => ({ ...p, zone: 'yellow' as const })),
    ...planosVencendo.verde.map(p => ({ ...p, zone: 'green' as const })),
  ]

  return (
    <div className="max-w-[1400px] space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cockpit</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão em tempo real das Ordens de Serviço</p>
      </div>

      {/* Status — cards coloridos */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {STATUS.map(({ key, label, icon: Icon, bg, text }) => (
          <a key={key} href={`/ordens-servico?status=${key}`}
            className={`rounded-xl p-5 flex flex-col gap-2 ${bg} hover:opacity-90 transition-opacity`}>
            <Icon size={20} className={text} />
            <p className={`text-3xl font-bold tabular-nums ${text}`}>{porStatus[key] ?? 0}</p>
            <p className={`text-xs font-medium uppercase tracking-wide ${text} opacity-80`}>{label}</p>
          </a>
        ))}
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <a href="/ordens-servico"
          className="bg-white border border-border rounded-xl p-4 hover:bg-surface transition-colors">
          <p className="text-xs text-gray-400 mb-1.5">Total de O.S.</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{total}</p>
        </a>

        <a href="/ordens-servico?atrasadas=1"
          className={`border rounded-xl p-4 transition-colors ${
            atrasadas > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100/60' : 'bg-white border-border hover:bg-surface'
          }`}>
          <p className={`text-xs mb-1.5 ${atrasadas > 0 ? 'text-red-400' : 'text-gray-400'}`}>Atrasadas</p>
          <p className={`text-2xl font-bold tabular-nums ${atrasadas > 0 ? 'text-red-600' : 'text-gray-300'}`}>
            {atrasadas}
          </p>
        </a>

        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1.5">Taxa de conclusão (mês)</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{taxaConclusao.percentual}%</p>
          <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                taxaConclusao.percentual >= 80 ? 'bg-emerald-500' :
                taxaConclusao.percentual >= 50 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${taxaConclusao.percentual}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {taxaConclusao.concluidas}/{taxaConclusao.total} concluídas
          </p>
        </div>

        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1.5">Custo do mês</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{fmtBRL(custoTotalMes)}</p>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1.5">Taxa de corretivas (mês)</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{taxaCorretivas}%</p>
          <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${taxaCorretivas >= 60 ? 'bg-red-400' : taxaCorretivas >= 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${taxaCorretivas}%` }}
            />
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1.5">Tempo médio de atend. (mês)</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {tempoMedioAtendimento != null ? `${tempoMedioAtendimento} d` : '—'}
          </p>
          {tempoMedioAtendimento != null && (
            <p className="text-[11px] text-gray-400 mt-1">agendamento → conclusão</p>
          )}
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1.5">Concluídas (últimos 30 dias)</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{painel.totalConcluidasRecente}</p>
        </div>
      </div>

      {/* Gráfico + técnicos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="xl:col-span-2 bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">O.S. por mês</h2>
            <Suspense>
              <YearSelector ano={ano} />
            </Suspense>
          </div>
          <OsChart data={historico} ano={ano} />
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Carga por técnico</h2>
          </div>
          {porTecnico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum técnico com O.S. ativa.</p>
          ) : (
            <div className="space-y-4">
              {porTecnico.map((t, idx) => (
                <div key={t.tecnicoId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-gray-300 tabular-nums w-4 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{t.nome}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-900 ml-2 shrink-0">{t.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                    <div
                      className="bg-primary/50 h-1 rounded-full transition-all"
                      style={{ width: `${maxTecnico > 0 ? Math.round((t.total / maxTecnico) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {t.concluiuUltimoMes > 0 && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {t.concluiuUltimoMes} concluídas/mês
                      </span>
                    )}
                    {t.atrasadas > 0 && (
                      <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {t.atrasadas} atrasadas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Planos vencendo + tipos de equipamento */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Planos */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Planos preventivos vencendo</h2>
            <span className="ml-auto text-xs text-gray-400 tabular-nums">
              {todosPlanosVencendo.length} total
            </span>
          </div>
          {todosPlanosVencendo.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Todos os planos estão em dia.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {todosPlanosVencendo.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.zone === 'red' ? 'bg-red-400' :
                    p.zone === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <a href={`/planos-manutencao/${p.id}`}
                    className="text-sm text-gray-700 hover:text-primary flex-1 truncate">
                    {p.cliente}
                    {!p.ativo && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">inativo</span>}
                  </a>
                  <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{fmtData(p.dataFim)}</span>
                </div>
              ))}
              {todosPlanosVencendo.length > 10 && (
                <p className="text-xs text-gray-400 pt-2">+{todosPlanosVencendo.length - 10} mais</p>
              )}
            </div>
          )}
        </div>

        {/* Tipos de equipamento */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">O.S. por tipo de equipamento</h2>
          </div>
          {tiposOrdenados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma O.S. com equipamento registrada.</p>
          ) : (
            <div className="space-y-3">
              {tiposOrdenados.map(([tipo, count]) => {
                const maxCount = tiposOrdenados[0][1]
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                return (
                  <div key={tipo}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{tipo}</span>
                      <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-primary/40 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top equipamentos problemáticos + OS sem técnico */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Top 5 equipamentos com mais corretivas (90 dias) */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Top equipamentos problemáticos</h2>
            <span className="ml-auto text-xs text-gray-400">últimos 90 dias</span>
          </div>
          {topEquipamentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma corretiva registrada.</p>
          ) : (
            <div className="space-y-3">
              {topEquipamentos.map((eq, i) => (
                <div key={eq.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-300 tabular-nums w-4 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <a href={`/equipamentos/${eq.id}/historico`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                    <p className="text-sm font-medium text-gray-800 truncate">{eq.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{eq.tipoEquipamento}{eq.cliente ? ` · ${eq.cliente}` : ''}</p>
                  </a>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                    eq.totalCorretivas >= 5 ? 'bg-red-100 text-red-700' :
                    eq.totalCorretivas >= 3 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {eq.totalCorretivas}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* O.S. sem técnico atribuído */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserX size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">O.S. sem técnico</h2>
            <span className={`ml-auto text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
              osSemTecnico.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {osSemTecnico.length}
            </span>
          </div>
          {osSemTecnico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Todas as O.S. têm técnico atribuído.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {osSemTecnico.map((os) => {
                const num = os.numero != null ? `OS-${String(os.numero).padStart(4, '0')}` : `OS-${os.id.slice(0, 6).toUpperCase()}`
                const atrasada = new Date(os.dataAgendamento) < new Date()
                return (
                  <div key={os.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <a href={`/ordens-servico/${os.id}`} className="text-sm font-medium text-gray-800 hover:text-primary">
                          {num}
                        </a>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${os.tipo === 'corretiva' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {os.tipo}
                        </span>
                        {atrasada && <span className="text-[10px] text-red-500 font-semibold">atrasada</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{os.cliente} · {os.ambiente}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                      {fmtData(os.dataAgendamento)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
