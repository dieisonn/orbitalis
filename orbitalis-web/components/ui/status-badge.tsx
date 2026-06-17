type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

const CONFIG: Record<OsStatus, { dot: string; text: string; bg: string; label: string }> = {
  aberta:       { dot: 'bg-blue-500',    text: 'text-blue-700',   bg: 'bg-blue-50',    label: 'Aberta' },
  agendada:     { dot: 'bg-amber-400',   text: 'text-amber-700',  bg: 'bg-amber-50',   label: 'Agendada' },
  em_andamento: { dot: 'bg-violet-500',  text: 'text-violet-700', bg: 'bg-violet-50',  label: 'Em andamento' },
  concluida:    { dot: 'bg-emerald-500', text: 'text-emerald-700',bg: 'bg-emerald-50', label: 'Concluída' },
  cancelada:    { dot: 'bg-red-400',     text: 'text-red-600',    bg: 'bg-red-50',     label: 'Cancelada' },
}

export function StatusBadge({ status }: { status: OsStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.aberta
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  )
}
