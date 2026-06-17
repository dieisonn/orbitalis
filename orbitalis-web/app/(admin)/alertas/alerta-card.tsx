'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, AlertCircle, Info, CheckCircle, ExternalLink } from 'lucide-react'
import { resolverAlerta } from './actions'

type Alerta = {
  id: string; tipo: string; severidade: 'info' | 'aviso' | 'critico'
  titulo: string; descricao: string; referenciaId: string | null
  resolvido: boolean; criadoEm: string
}

const SEV_STYLES = {
  critico: { bg: 'bg-red-50 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  aviso:   { bg: 'bg-yellow-50 border-yellow-200', icon: AlertCircle, iconColor: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  info:    { bg: 'bg-blue-50 border-blue-100', icon: Info, iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
}

const TIPO_LINKS: Record<string, (id: string) => string> = {
  os_atrasada:            (id) => `/ordens-servico/${id}`,
  os_sem_atualizacao:     (id) => `/ordens-servico/${id}`,
  contrato_vencendo:      (id) => `/contratos/${id}`,
  equipamento_reincidente:(id) => `/equipamentos/${id}/historico`,
}

const SEV_LABELS: Record<string, string> = { critico: 'Crítico', aviso: 'Aviso', info: 'Info' }
const TIPO_LABELS: Record<string, string> = {
  os_atrasada: 'O.S. Atrasada', os_sem_atualizacao: 'Sem Atualização',
  contrato_vencendo: 'Contrato', equipamento_reincidente: 'Reincidente',
  plano_vencendo: 'Plano',
}

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const style = SEV_STYLES[alerta.severidade] ?? SEV_STYLES.info
  const Icon = style.icon
  const link = alerta.referenciaId && TIPO_LINKS[alerta.tipo] ? TIPO_LINKS[alerta.tipo](alerta.referenciaId) : null

  function handleResolver() {
    startTransition(async () => {
      await resolverAlerta(alerta.id)
      router.refresh()
    })
  }

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-4 ${style.bg} ${alerta.resolvido ? 'opacity-60' : ''}`}>
      <Icon size={18} className={`${style.iconColor} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
            {SEV_LABELS[alerta.severidade]}
          </span>
          <span className="text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-full border border-gray-100">
            {TIPO_LABELS[alerta.tipo] ?? alerta.tipo}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(alerta.criadoEm).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-800">{alerta.titulo}</p>
        <p className="text-xs text-gray-600 mt-0.5">{alerta.descricao}</p>
        <div className="flex items-center gap-3 mt-2">
          {link && (
            <a href={link} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <ExternalLink size={11} /> Ver detalhes
            </a>
          )}
          {!alerta.resolvido && (
            <button onClick={handleResolver} disabled={pending}
              className="text-xs text-green-700 font-semibold hover:underline flex items-center gap-1 disabled:opacity-60">
              <CheckCircle size={11} /> Marcar como resolvido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
