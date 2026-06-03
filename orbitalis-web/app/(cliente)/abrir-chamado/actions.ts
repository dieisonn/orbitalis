'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function abrirChamado(ambienteId: string, observacoes: string) {
  await api.post('/ordens-servico', {
    ambienteId,
    origem: 'portal_cliente',
    dataAgendamento: new Date().toISOString(),
    observacoesGerais: observacoes || undefined,
  })
  redirect('/historico')
}
