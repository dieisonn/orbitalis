'use server'

import { api } from '@/lib/api'

export async function atualizarStatusOs(osId: string, status: string) {
  await api.patch(`/ordens-servico/${osId}/status`, { status })
}

type ItemSincronizado = {
  itemId: string
  statusItem: 'pendente' | 'concluido'
  observacoesTecnicas?: string
  checklist: unknown
}

export async function sincronizarOs(
  osId: string,
  data: {
    itens: ItemSincronizado[]
    assinaturaBase64?: string
    observacoesGerais?: string
    recebidoPor?: string
    observacoesTecnico?: string
    concluir?: boolean
    entrada?: string
    saida?: string
  },
) {
  return api.patch(`/ordens-servico/${osId}/sincronizar`, data)
}

/** Checklist da última visita concluída do equipamento (para repetir as respostas). */
export async function ultimoChecklist(equipamentoId: string): Promise<{
  osNumero: string; data: string | null; checklist: { id: string; descricao: string; resultado?: string | null; marcado?: boolean }[]
} | null> {
  try {
    const r = await api.get<{ osNumero: string; data: string | null; checklist: unknown } | null>(`/ordens-servico/equipamento/${equipamentoId}/ultimo`)
    if (!r) return null
    return { osNumero: r.osNumero, data: r.data, checklist: Array.isArray(r.checklist) ? r.checklist : [] }
  } catch {
    return null
  }
}
