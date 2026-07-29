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
  },
) {
  return api.patch(`/ordens-servico/${osId}/sincronizar`, data)
}
