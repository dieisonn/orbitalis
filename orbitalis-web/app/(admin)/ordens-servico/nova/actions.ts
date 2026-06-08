'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarOs(
  ambienteId: string,
  tecnicoId: string,
  dataAgendamento: string,
  observacoesGerais: string,
) {
  await api.post('/ordens-servico', {
    ambienteId,
    tecnicoId: tecnicoId || undefined,
    origem: 'manual_admin',
    dataAgendamento,
    observacoesGerais: observacoesGerais || undefined,
  })
  redirect('/ordens-servico')
}
