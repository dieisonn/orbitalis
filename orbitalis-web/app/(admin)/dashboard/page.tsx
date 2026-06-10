import { api } from '@/lib/api'
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle,
  XCircle, AlertCircle, TrendingUp, User,
} from 'lucide-react'
import { OsChart } from '@/components/ui/os-chart'

type TaxaConclusao = { concluidas: number; total: number; percentual: number }
type Tecnico = {
  tecnicoId: string; nome: string; email: string
  aberta: number; agendada: number; em_andamento: number; total: number
}
type Painel = {
  porStatus: Partial<Record<string, number>>
  atrasadas: number
  taxaConclusao: TaxaConclusao
  porTecnico: Tecnico[]
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

export default async function DashboardPage() {
  const [painel, historico] = await Promise.all([
    api.get<Painel>('/ordens-servico/painel').catch(() => ({
      porStatus: {},
      atrasadas: 0,
      taxaConclusao: { concluidas: 0, total: 0, percentual: 0 },
      porTecnico: [],
    })),
    api.get<Historico[]>('/ordens-servico/historico').catch(() => [] as Historico[]),
  ])

  const { porStatus, atrasadas, taxaConclusao, porTecnico } = painel
  const total = Object.values(porStatus).reduce((s, n) => s + (n ?? 0), 0)
  const maxTecnico = porTecnico[0]?.total ?? 1

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
            {/* Barra de progresso */}
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

      {/* ── Linha 3: gráfico + ranking técnicos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Gráfico histórico */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">O.S. por mês de agendamento</h2>
            <span className="text-xs text-gray-400">6 anteriores · atual · 5 futuros</span>
          </div>
          <OsChart data={historico} />
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
                  <div className="flex gap-3 mt-1.5">
                    {t.aberta > 0 && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {t.aberta} abertas
                      </span>
                    )}
                    {t.agendada > 0 && (
                      <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        {t.agendada} agend.
                      </span>
                    )}
                    {t.em_andamento > 0 && (
                      <span className="text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">
                        {t.em_andamento} em and.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
