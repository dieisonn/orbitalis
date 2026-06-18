'use server'

import { api } from '@/lib/api'
import { redirect } from 'next/navigation'

export async function editarOs(
  osId: string,
  data: { dataAgendamento: string; observacoesGerais: string; tecnicoId: string; tipo: string },
) {
  await api.patch(`/ordens-servico/${osId}`, {
    dataAgendamento: data.dataAgendamento,
    observacoesGerais: data.observacoesGerais || null,
    tecnicoId: data.tecnicoId || null,
    tipo: data.tipo,
  })
  redirect(`/ordens-servico/${osId}`)
}
