'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function triarOs(osId: string, tecnicoId: string, dataAgendamento: string) {
  await api.patch(`/ordens-servico/${osId}/triar`, { tecnicoId, dataAgendamento })
  redirect('/ordens-servico')
}

export async function cancelarOs(osId: string) {
  await api.patch(`/ordens-servico/${osId}/cancelar`, {})
  redirect('/ordens-servico')
}

export async function alterarStatusOs(osId: string, status: string) {
  await api.patch(`/ordens-servico/${osId}/status`, { status })
  redirect('/ordens-servico')
}
