'use server'
import { api } from '@/lib/api'

export async function triarOs(osId: string, tecnicoId: string, dataAgendamento: string) {
  await api.patch(`/ordens-servico/${osId}/triar`, { tecnicoId, dataAgendamento })
}

export async function cancelarOs(osId: string) {
  await api.patch(`/ordens-servico/${osId}/cancelar`, {})
}

export async function alterarStatusOs(osId: string, status: string) {
  await api.patch(`/ordens-servico/${osId}/status`, { status })
}
