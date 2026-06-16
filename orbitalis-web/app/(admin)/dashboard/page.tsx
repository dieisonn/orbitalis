import { Suspense } from 'react'
import { api } from '@/lib/api'
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle,
  XCircle, AlertCircle, TrendingUp, User, Wrench, CalendarClock,
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
type Painel = {
  porStatus: Record<string, number>
  atrasadas: number
  taxaConclusao: TaxaConclusao
  porTecnico: Tecnico[]
  porTipoEquipamento: Record<string, number>
  planosVencendo: PlanosVencendo
}
type Historico = {
  mes: string; aberta: number; agendada: number
  em_andamento: number; concluida: number; cancelada: number
}

const STATUS_CARDS = [
  { key: 'aberta',       label: 'Abertas',      icon: ClipboardList, bg: 'bg-blue-600',    text: 'text-white' },
  { key: 'agendada',     label: 'Agendadas',     icon: Clock,         bg: 'bg-orange-100',  text: 'text-orange-700' },
  { key: 'em_andamento', label: 'Em Andamento',  icon: AlertTriangle, bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  { key: 'concluida',    label: 'Concluídas',    icon: CheckCircle,   bg: 'bg-green-600',   text: 'text-white' },
  { key: 'cancelada',    label: 'Canceladas',    icon: XCircle,       bg: 'bg-red-600',     text: 'text-white' },
]

function TecnicoBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function formatarData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

type Props = { searchParams: Promise<{ ano?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  const { ano: anoParam } = await searchParams
  const anoAtual = new Date().getFullYear()
  const ano = anoParam ? Math.max(2020, Math.min(anoAtual + 1, Number(anoParam))) : anoAtual

  const defaultPainel: Painel = {
    porStatus: {},
    atrasadas: 0,
    taxaConclusao: { concluidas: 0, total: 0, percentual: 0 },
    porTecnico: [],
    porTipoEquipamento: {},
    planosVencendo: { vermelho: [], amarelo: [], verde: [] },
  }

  const [painel, historico] = await Promise.all([
    api.get<Painel>('/ordens-servico/painel').catch(() => defaultPainel),
    api.get<Historico[]>(`/ordens-servico/historico?ano=${ano}`).catch(() => [] as Historico[]),
  ])

  const { porStatus, atrasadas, taxaConclusao, porTecnico, porTipoEquipamento, planosVencendo } = painel
  const total = Object.values(porStatus).reduce<number>((s, n) => s + (n ?? 0), 0)
  const maxTecnico = porTecnico[0]?.total ?? 1

  const tiposOrdenados = Object.entries(porTipoEquipamento)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Cockpit</h1>
        <p className="text-gray-500 text-sm mt-1">Visão em tempo real das Ordens de Serviço</p>
      </div>

      {/* ── Linha 1: contadores de status ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
        {STATUS_CARDS.map(({ key, label, icon: Icon, bg, text }) => (
          <a key={key} href={`/ordens-servico?status=${key}`}
            className={`rounded-2xl p-5 flex flex-col gap-2 shadow-sm ${bg} hover:opacity-90 transition-opacity cursor-pointer`}>
            <Icon size={20} className={text} />
            <p className={`text-3xl font-bold ${text}`}>{porStatus[key] ?? 0}</p>
            <p className={`text-xs font-medium uppercase tracking-wide ${text} opacity-80`}>{label}</p>
          </a>
        ))}
      </div>

      {/* ── Linha 2: total + atrasadas + taxa de conclusão ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Total */}
        <a href="/ordens-servico"
          className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between hover:bg-surface transition-colors">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total cadastradas</p>
            <p className="text-4xl font-bold text-primary">{total}</p>
          </div>
          <ClipboardList size={40} className="text-primary/20" />
        </a>

        {/* O.S. atrasadas */}
        <a href="/ordens-servico?atrasadas=1"
          className={`rounded-2xl p-6 shadow-sm border flex items-center justify-between hover:opacity-90 transition-opacity ${
            atrasadas > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-border'
          }`}>
          <div>
            <p className={`text-xs uppercase tracking-widest mb-1 font-medium ${atrasadas > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              Atrasadas
            </p>
            <p className={`text-4xl font-bold ${atrasadas > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {atrasadas}
            </p>
            <p className={`text-xs mt-1 ${atrasadas > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {atrasadas > 0 ? 'O.S. passaram da data sem conclusão' : 'Tudo em dia!'}
            </p>
          </div>
          <AlertCircle size={40} className={atrasadas > 0 ? 'text-red-300' : 'text-gray-200'} />
        </a>

        {/* Taxa de conclusão do mês */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Taxa de conclusão</p>
            <p className="text-4xl font-bold text-primary">{taxaConclusao.percentual}%</p>
            <p className="text-xs text-gray-400 mt-1">
              {taxaConclusao.concluidas} de {taxaConclusao.total} O.S. do mês concluídas
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full transition-all ${
                  taxaConclusao.percentual >= 80 ? 'bg-green-500' :
                  taxaConclusao.percentual >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${taxaConclusao.percentual}%` }}
              />
            </div>
          </div>
          <TrendingUp size={40} className="text-primary/20 ml-4 shrink-0" />
        </div>
      </div>

      {/* ── Linha 3: alertas de planos vencendo ── */}
      <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Planos preventivos vencendo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Vermelho — vence em até 30 dias */}
            <div className={`rounded-2xl p-5 border ${planosVencendo.vermelho.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-border opacity-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${planosVencendo.vermelho.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  Vence em até 1 mês
                </span>
                <span className={`text-2xl font-bold ${planosVencendo.vermelho.length > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                  {planosVencendo.vermelho.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {planosVencendo.vermelho.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <a href={`/planos-manutencao/${p.id}`} className="text-xs text-red-700 hover:underline truncate">{p.cliente}</a>
                    <div className="flex items-center gap-1 shrink-0">
                      {!p.ativo && <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">inativo</span>}
                      <span className="text-[10px] text-red-500">{formatarData(p.dataFim)}</span>
                    </div>
                  </li>
                ))}
                {planosVencendo.vermelho.length > 4 && (
                  <li className="text-[10px] text-red-400">+{planosVencendo.vermelho.length - 4} mais</li>
                )}
              </ul>
            </div>

            {/* Amarelo — vence em 1–2 meses */}
            <div className={`rounded-2xl p-5 border ${planosVencendo.amarelo.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-border opacity-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${planosVencendo.amarelo.length > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
                  Vence em 1–2 meses
                </span>
                <span className={`text-2xl font-bold ${planosVencendo.amarelo.length > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                  {planosVencendo.amarelo.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {planosVencendo.amarelo.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <a href={`/planos-manutencao/${p.id}`} className="text-xs text-yellow-800 hover:underline truncate">{p.cliente}</a>
                    <div className="flex items-center gap-1 shrink-0">
                      {!p.ativo && <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">inativo</span>}
                      <span className="text-[10px] text-yellow-600">{formatarData(p.dataFim)}</span>
                    </div>
                  </li>
                ))}
                {planosVencendo.amarelo.length > 4 && (
                  <li className="text-[10px] text-yellow-500">+{planosVencendo.amarelo.length - 4} mais</li>
                )}
              </ul>
            </div>

            {/* Verde — vence em 2–3 meses */}
            <div className={`rounded-2xl p-5 border ${planosVencendo.verde.length > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-border opacity-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${planosVencendo.verde.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                  Vence em 2–3 meses
                </span>
                <span className={`text-2xl font-bold ${planosVencendo.verde.length > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                  {planosVencendo.verde.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {planosVencendo.verde.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <a href={`/planos-manutencao/${p.id}`} className="text-xs text-green-800 hover:underline truncate">{p.cliente}</a>
                    <div className="flex items-center gap-1 shrink-0">
                      {!p.ativo && <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">inativo</span>}
                      <span className="text-[10px] text-green-600">{formatarData(p.dataFim)}</span>
                    </div>
                  </li>
                ))}
                {planosVencendo.verde.length > 4 && (
                  <li className="text-[10px] text-green-500">+{planosVencendo.verde.length - 4} mais</li>
                )}
              </ul>
            </div>

          </div>
        </div>

      {/* ── Linha 4: gráfico + ranking técnicos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* Gráfico histórico */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">O.S. por mês de agendamento</h2>
            <Suspense>
              <YearSelector ano={ano} />
            </Suspense>
          </div>
          <OsChart data={historico} ano={ano} />
        </div>

        {/* Ranking de técnicos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Carga por técnico</h2>
          </div>

          {porTecnico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhum técnico com O.S. ativa.
            </p>
          ) : (
            <div className="space-y-5">
              {porTecnico.map((t, idx) => (
                <div key={t.tecnicoId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-4 shrink-0">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{t.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-primary ml-2 shrink-0">{t.total}</span>
                  </div>
                  <TecnicoBar value={t.total} max={maxTecnico} />
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {t.concluiuUltimoMes > 0 && (
                      <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        {t.concluiuUltimoMes} concluídas/mês
                      </span>
                    )}
                    {t.atrasadas > 0 && (
                      <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {t.atrasadas} atrasadas
                      </span>
                    )}
                    {t.aIniciar > 0 && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {t.aIniciar} a iniciar
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Linha 5: O.S. por tipo de equipamento ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-5">
          <Wrench size={16} className="text-gray-400" />
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
                    <span className="text-sm text-gray-700">{tipo}</span>
                    <span className="text-sm font-bold text-primary">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-primary/60 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
