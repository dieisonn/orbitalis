'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from 'lucide-react'

const ETAPAS = [
  {
    key:   'perfil',
    label: 'Complete seu perfil',
    desc:  'Adicione seu nome para personalizar o sistema',
    href:  '/perfil',
  },
  {
    key:   'cliente',
    label: 'Cadastre o primeiro cliente',
    desc:  'Clientes são a base de toda gestão de ativos',
    href:  '/clientes/novo',
  },
  {
    key:   'tecnico',
    label: 'Convide um técnico',
    desc:  'Adicione alguém à sua equipe de campo',
    href:  '/equipe',
  },
  {
    key:   'equipamento',
    label: 'Registre um equipamento',
    desc:  'Cadastre o primeiro ativo para manutenção',
    href:  '/equipamentos/novo',
  },
  {
    key:   'ordemServico',
    label: 'Crie uma ordem de serviço',
    desc:  'Abra sua primeira OS preventiva ou corretiva',
    href:  '/ordens-servico/nova',
  },
]

type Etapas = { [key: string]: boolean }

const BASE_KEY = 'orbitalis_onboarding_dismissed'

export function OnboardingCard({
  etapas,
  empresaId,
}: {
  etapas: Etapas
  empresaId?: string
}) {
  const [dismissed, setDismissed] = useState(true) // começa oculto até ler localStorage
  const [expanded, setExpanded] = useState(true)

  const storageKey = empresaId ? `${BASE_KEY}_${empresaId}` : BASE_KEY

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === '1')
    } catch {
      setDismissed(false)
    }
  }, [storageKey])

  const concluidas = ETAPAS.filter((e) => !!etapas[e.key]).length
  const total = ETAPAS.length
  const todasConcluidas = concluidas === total
  const pct = Math.round((concluidas / total) * 100)

  if (todasConcluidas || dismissed) return null

  function dismiss() {
    try { localStorage.setItem(storageKey, '1') } catch {}
    setDismissed(true)
  }

  return (
    <div className="bg-white rounded-xl border border-primary/25 overflow-hidden shadow-sm">
      {/* Header clicável */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Rocket size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Primeiros passos</p>
            <span className="text-xs font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-full tabular-nums">
              {concluidas}/{total}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 max-w-[140px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400">{pct}% concluído</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss() }}
          className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors rounded-md hover:bg-gray-100"
          title="Dispensar"
        >
          <X size={13} />
        </button>
        {expanded
          ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
          : <ChevronDown size={15} className="text-gray-400 shrink-0" />
        }
      </div>

      {/* Etapas */}
      {expanded && (
        <div className="border-t border-border">
          {ETAPAS.map((etapa, i) => {
            const done = !!etapas[etapa.key]
            return (
              <div
                key={etapa.key}
                className={[
                  'flex items-center gap-3 px-5 py-3',
                  i < ETAPAS.length - 1 ? 'border-b border-border/50' : '',
                  done ? 'opacity-60' : '',
                ].join(' ')}
              >
                {done
                  ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  : <Circle      size={18} className="text-gray-300 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? 'line-through text-gray-400' : 'font-medium text-gray-900'}`}>
                    {etapa.label}
                  </p>
                  {!done && (
                    <p className="text-xs text-gray-400 mt-0.5">{etapa.desc}</p>
                  )}
                </div>
                {!done && (
                  <Link
                    href={etapa.href}
                    className="text-xs font-semibold text-primary hover:text-primary/70 hover:underline shrink-0 transition-colors"
                  >
                    Fazer agora →
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
