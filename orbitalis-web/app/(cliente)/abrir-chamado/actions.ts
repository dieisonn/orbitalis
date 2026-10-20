'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function abrirChamado(ambienteId: string, observacoes: string, equipamentoId?: string) {
  await api.post('/ordens-servico', {
    ambienteId,
    equipamentoId: equipamentoId || undefined,
    origem: 'portal_cliente',
    dataAgendamento: new Date().toISOString(),
    observacoesGerais: observacoes || undefined,
  })
  redirect('/historico')
}
