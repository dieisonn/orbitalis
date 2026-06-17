'use server'
import { api } from '@/lib/api'

export async function triarOs(osId: string, tecnicoId: string, dataAgendamento: string) {
  try {
    await api.patch(`/ordens-servico/${osId}/triar`, { tecnicoId, dataAgendamento })
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao despachar' }
  }
}

export async function cancelarOs(osId: string) {
  try {
    await api.patch(`/ordens-servico/${osId}/cancelar`, {})
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao cancelar' }
  }
}

export async function alterarStatusOs(osId: string, status: string) {
  try {
    await api.patch(`/ordens-servico/${osId}/status`, { status })
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao alterar status' }
  }
}

export async function concluirOs(
  osId: string,
  data: { assinaturaBase64?: string | null; tipoGas?: string; quantidadeGasGramas?: number },
) {
  try {
    await api.patch(`/ordens-servico/${osId}/concluir`, data)
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao concluir' }
  }
}
