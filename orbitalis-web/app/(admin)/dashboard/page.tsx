import { api } from '@/lib/api'
import { ClipboardList, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type Painel = Partial<Record<string, number>>

const CARDS = [
  {
    key: 'aberta',
    label: 'Abertas',
    icon: ClipboardList,
    bg: 'bg-action',
    text: 'text-white',
  },
  {
    key: 'agendada',
    label: 'Agendadas',
    icon: Clock,
    bg: 'bg-scheduled',
    text: 'text-primary',
  },
  {
    key: 'em_andamento',
    label: 'Em Andamento',
    icon: AlertTriangle,
    bg: 'bg-warning',
    text: 'text-primary',
  },
  {
    key: 'concluida',
    label: 'Concluídas',
    icon: CheckCircle,
    bg: 'bg-action',
    text: 'text-white',
  },
  {
    key: 'cancelada',
    label: 'Canceladas',
    icon: XCircle,
    bg: 'bg-destructive',
    text: 'text-white',
  },
]

export default async function DashboardPage() {
  let painel: Painel = {}
  try {
    painel = await api.get<Painel>('/ordens-servico/painel')
  } catch {
    // API indisponível — mostra zeros
  }

  const total = Object.values(painel).reduce((s: number, n) => s + (n ?? 0), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Cockpit</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visão em tempo real das Ordens de Serviço
        </p>
      </div>

      {/* Contadores clicáveis */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {CARDS.map(({ key, label, icon: Icon, bg, text }) => (
          <a
            key={key}
            href={`/ordens-servico?status=${key}`}
            className={`rounded-2xl p-5 flex flex-col gap-2 shadow-sm ${bg} hover:opacity-90 transition-opacity cursor-pointer`}
          >
            <Icon size={20} className={text} />
            <p className={`text-3xl font-bold ${text}`}>
              {painel[key] ?? 0}
            </p>
            <p className={`text-xs font-medium uppercase tracking-wide ${text} opacity-80`}>
              {label}
            </p>
          </a>
        ))}
      </div>

      {/* Total */}
      <a
        href="/ordens-servico"
        className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between hover:bg-surface transition-colors block"
      >
        <div>
          <p className="text-sm text-gray-500">Total de O.S. cadastradas</p>
          <p className="text-4xl font-bold text-primary mt-1">{total}</p>
        </div>
        <ClipboardList size={48} className="text-primary/20" />
      </a>
    </div>
  )
}
