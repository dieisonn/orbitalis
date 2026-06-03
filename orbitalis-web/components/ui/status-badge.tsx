// Badges de status com as cores semânticas exatas do blueprint §2
type OsStatus = 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'

const CONFIG: Record<OsStatus, { bg: string; text: string; label: string }> = {
  aberta:       { bg: 'bg-action',      text: 'text-white',   label: 'Aberta' },
  agendada:     { bg: 'bg-scheduled',   text: 'text-primary', label: 'Agendada' },
  em_andamento: { bg: 'bg-warning',     text: 'text-primary', label: 'Em Andamento' },
  concluida:    { bg: 'bg-action',      text: 'text-white',   label: 'Operando' },
  cancelada:    { bg: 'bg-destructive', text: 'text-white',   label: 'Cancelada' },
}

export function StatusBadge({ status }: { status: OsStatus }) {
  const { bg, text, label } = CONFIG[status] ?? CONFIG.aberta
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}
