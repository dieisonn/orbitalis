'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { ClipboardList, ChevronRight } from 'lucide-react'
import type { OsHistorico } from './page'

type Tab = 'andamento' | 'concluidas' | 'todas'

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin:          'Admin',
  preventiva_automatica: 'Preventiva',
  portal_cliente:        'Solicitado por você',
  orcamento_aprovado:        'Orçamento aprovado',
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function HistoricoList({ ordens }: { ordens: OsHistorico[] }) {
  const [tab, setTab] = useState<Tab>('andamento')

  const ativas    = ordens.filter((o) => ['aberta', 'agendada', 'em_andamento'].includes(o.status))
  const concluidas = ordens.filter((o) => o.status === 'concluida')
  const lista = tab === 'andamento' ? ativas : tab === 'concluidas' ? concluidas : ordens

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'andamento',  label: 'Em andamento', count: ativas.length },
    { key: 'concluidas', label: 'Concluídas',    count: concluidas.length },
    { key: 'todas',      label: 'Todas',          count: ordens.length },
  ]

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Manutenções</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {ordens.length} O.S. registrada{ordens.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit border border-border">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {label}
            <span className={[
              'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
              tab === key ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-400',
            ].join(' ')}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-border">
          <ClipboardList size={36} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">
            {tab === 'andamento' ? 'Nenhuma O.S. em andamento.' : 'Nenhuma O.S. encontrada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((os) => {
            const itensDone = os.itens.filter((i) => i.statusItem === 'concluido').length
            return (
              <Link
                key={os.id}
                href={`/historico/${os.id}`}
                className="flex items-center justify-between gap-4 bg-white border border-border rounded-xl px-5 py-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={os.status} />
                    <span className="text-xs text-gray-400">
                      {ORIGEM_LABEL[os.origem] ?? os.origem}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary transition-colors">
                    {os.ambiente?.nome ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtData(os.dataAgendamento)}
                    {os.tecnico
                      ? ` · ${os.tecnico.nome ?? os.tecnico.email}`
                      : ' · Aguardando técnico'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {os.itens.length > 0 && (
                    <span className="text-xs text-gray-400 tabular-nums">
                      {itensDone}/{os.itens.length} itens
                    </span>
                  )}
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
