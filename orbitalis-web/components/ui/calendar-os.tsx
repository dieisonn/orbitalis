'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type OsEvent = {
  id: string
  numero: number | null
  status: string
  tipo: string
  dataAgendamento: string
  ambienteNome: string
  clienteNome: string
  tecnicoNome: string | null
}

const STATUS_COLOR: Record<string, string> = {
  aberta:       'bg-blue-500',
  agendada:     'bg-yellow-500',
  em_andamento: 'bg-purple-500',
  concluida:    'bg-green-500',
  cancelada:    'bg-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  aberta:       'Aberta',
  agendada:     'Agendada',
  em_andamento: 'Em andamento',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function osKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
}

export function CalendarOs({ events }: { events: OsEvent[] }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map: Record<string, OsEvent[]> = {}
    for (const ev of events) {
      const k = osKey(ev.dataAgendamento)
      if (!map[k]) map[k] = []
      map[k].push(ev)
    }
    return map
  }, [events])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const firstDay   = new Date(year, month, 1)
  const startDow   = firstDay.getDay()
  const daysInMo   = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((startDow + daysInMo) / 7) * 7

  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1
    cells.push(dayNum >= 1 && dayNum <= daysInMo ? new Date(year, month, dayNum) : null)
  }

  const todayKey    = toKey(today)
  const selectedEvs = selected ? (byDay[selected] ?? []) : []

  return (
    <div className="flex gap-6 flex-col xl:flex-row">
      {/* Calendário */}
      <div className="flex-1 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Navegação */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h2 className="font-bold text-gray-800 text-base">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} className="min-h-[80px] bg-surface/50 border-b border-r border-border/50 last:border-r-0" />

            const key   = toKey(date)
            const evs   = byDay[key] ?? []
            const isToday    = key === todayKey
            const isSelected = key === selected

            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`min-h-[80px] p-2 border-b border-r border-border/50 text-left transition-colors last:border-r-0
                  ${isSelected ? 'bg-primary/5 ring-inset ring-1 ring-primary/30' : 'hover:bg-surface'}
                `}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1
                  ${isToday ? 'bg-primary text-white' : 'text-gray-600'}
                `}>
                  {date.getDate()}
                </span>

                {evs.length > 0 && (
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate ${STATUS_COLOR[ev.status] ?? 'bg-gray-400'}`}
                      >
                        {ev.ambienteNome}
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{evs.length - 3} mais</p>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Painel lateral */}
      <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
        {selected ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface">
              <p className="text-sm font-bold text-gray-800">
                {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{selectedEvs.length} O.S. agendada{selectedEvs.length !== 1 ? 's' : ''}</p>
            </div>
            {selectedEvs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma O.S. neste dia.</p>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {selectedEvs.map(ev => (
                  <a
                    key={ev.id}
                    href={`/ordens-servico/${ev.id}`}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STATUS_COLOR[ev.status] ?? 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {ev.numero != null ? `OS-${String(ev.numero).padStart(4,'0')}` : `OS-${ev.id.slice(0,6).toUpperCase()}`}
                        {' '}
                        <span className="font-normal text-gray-500">{ev.ambienteNome}</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">{ev.clienteNome}</p>
                      {ev.tecnicoNome && (
                        <p className="text-xs text-gray-400 truncate">Téc: {ev.tecnicoNome}</p>
                      )}
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${STATUS_COLOR[ev.status] ?? 'bg-gray-400'}`}>
                        {STATUS_LABEL[ev.status] ?? ev.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400">Clique em um dia para ver as O.S. agendadas.</p>
          </div>
        )}

        {/* Legenda — sempre visível */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <div className="space-y-2">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm shrink-0 ${STATUS_COLOR[k]}`} />
                <span className="text-xs text-gray-500">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
