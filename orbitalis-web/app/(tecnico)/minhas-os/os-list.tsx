'use client'

import { useState } from 'react'
import { StatusBadge, osAtrasada } from '@/components/ui/status-badge'
import { ClipboardList, AlertTriangle } from 'lucide-react'

type OrdemServico = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  ambiente: { nome: string; localizacaoInterna: string }
  itens: { id: string }[]
}

type Tab = 'pendentes' | 'hoje' | 'concluidas'

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente: 'Portal',
  orcamento_aprovado: 'Orçamento aprovado',
}

function isHoje(isoDate: string): boolean {
  const d = new Date(isoDate)
  const h = new Date()
  return (
    d.getFullYear() === h.getFullYear() &&
    d.getMonth() === h.getMonth() &&
    d.getDate() === h.getDate()
  )
}

function isAtrasada(os: OrdemServico): boolean {
  if (os.status === 'concluida' || os.status === 'cancelada') return false
  return osAtrasada(os.status, os.dataAgendamento)
}

export function OsList({ ordens }: { ordens: OrdemServico[] }) {
  const [tab, setTab] = useState<Tab>('pendentes')

  const pendentes = ordens.filter(
    (os) => !['concluida', 'cancelada'].includes(os.status),
  )
  const hoje = ordens.filter(
    (os) => isHoje(os.dataAgendamento) && !['concluida', 'cancelada'].includes(os.status),
  )
  const concluidas = ordens.filter((os) =>
    ['concluida', 'cancelada'].includes(os.status),
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: pendentes.length },
    { key: 'hoje', label: 'Hoje', count: hoje.length },
    { key: 'concluidas', label: 'Concluídas', count: concluidas.length },
  ]

  const filtered =
    tab === 'pendentes' ? pendentes : tab === 'hoje' ? hoje : concluidas

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-primary">Minhas O.S.</h1>
        <p className="text-gray-500 text-xs mt-0.5">
          {ordens.length} ordem(ns) atribuída(s) a você
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 mb-4 border border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
              tab === t.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={[
                  'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1',
                  tab === t.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600',
                ].join(' ')}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-border">
          <ClipboardList size={36} className="mx-auto text-primary/20 mb-2" />
          <p className="text-gray-400 text-sm">
            {tab === 'hoje'
              ? 'Nenhuma O.S. agendada para hoje.'
              : tab === 'concluidas'
              ? 'Nenhuma O.S. concluída.'
              : 'Nenhuma O.S. pendente no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((os) => {
            const atrasada = isAtrasada(os)
            return (
              <a
                key={os.id}
                href={`/minhas-os/${os.id}`}
                className={[
                  'block rounded-2xl p-4 border transition-colors',
                  atrasada
                    ? 'bg-red-50 border-red-200 hover:bg-red-100/70'
                    : 'bg-white border-border hover:bg-surface',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-400">
                        OS-{os.id.slice(0, 6).toUpperCase()}
                      </span>
                      <StatusBadge
                        status={
                          os.status as
                            | 'aberta'
                            | 'agendada'
                            | 'em_andamento'
                            | 'concluida'
                            | 'cancelada'
                        }
                      />
                      {atrasada && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600">
                          <AlertTriangle size={10} />
                          Atrasada
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {os.ambiente.nome}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {os.ambiente.localizacaoInterna}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">
                      {ORIGEM_LABEL[os.origem] ?? os.origem}
                    </p>
                    <p className="text-xs font-medium text-gray-600 mt-0.5">
                      {new Date(os.dataAgendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {os.itens.length} equip.
                    </p>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
