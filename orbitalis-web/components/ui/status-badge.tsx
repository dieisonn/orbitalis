export type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

const CONFIG: Record<OsStatus, { dot: string; text: string; bg: string; label: string }> = {
  aberta:       { dot: 'bg-sky-600',     text: 'text-sky-800',     bg: 'bg-sky-50',     label: 'Aberta' },
  agendada:     { dot: 'bg-gray-500',    text: 'text-gray-700',    bg: 'bg-gray-100',   label: 'Agendada' },
  em_andamento: { dot: 'bg-amber-500',   text: 'text-amber-800',   bg: 'bg-amber-50',   label: 'Em andamento' },
  concluida:    { dot: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50', label: 'Concluída' },
  cancelada:    { dot: 'bg-red-600',     text: 'text-red-800',     bg: 'bg-red-50',     label: 'Cancelada' },
}

/** O.S. não concluída/cancelada cujo dia agendado (data UTC, fuso do Brasil) já passou. */
export function osAtrasada(status: string, dataAgendamento?: string | null): boolean {
  if (!dataAgendamento || status === 'concluida' || status === 'cancelada') return false
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
  return dataAgendamento.slice(0, 10) < hoje
}

export function StatusBadge({ status, data }: { status: OsStatus; data?: string | null }) {
  const cfg = CONFIG[status] ?? CONFIG.aberta
  const atrasada = osAtrasada(status, data)
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
    {atrasada && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap bg-red-100 text-red-700">Atrasada</span>}
    </span>
  )
}
