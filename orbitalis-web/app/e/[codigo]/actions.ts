'use server'

import { api } from '@/lib/api'

export async function abrirChamadoQr(
  ambienteId: string,
  dataAgendamento: string,
  observacoes: string,
): Promise<{ id: string }> {
  return api.post<{ id: string }>('/ordens-servico', {
    ambienteId,
    origem: 'portal_cliente',
    dataAgendamento,
    observacoesGerais: observacoes || undefined,
  })
}
