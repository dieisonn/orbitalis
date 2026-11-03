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

// "2026-11-03T14:30" (horário de Brasília, digitado no campo) → instante em UTC
const paraInstante = (local?: string) => (local ? new Date(`${local}:00-03:00`).toISOString() : undefined)

export async function alterarStatusOs(osId: string, status: string, quando?: string, observacao?: string) {
  try {
    await api.patch(`/ordens-servico/${osId}/status`, { status, dataOcorrencia: paraInstante(quando), observacao: observacao?.trim() || undefined })
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

export async function alterarStatusLote(ids: string[], status: string, quando?: string, observacao?: string) {
  try {
    const res = await api.patch<{ atualizadas: number }>('/ordens-servico/bulk-status', { ids, status, dataOcorrencia: paraInstante(quando), observacao: observacao?.trim() || undefined })
    return { ok: true as const, atualizadas: res.atualizadas }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao alterar status em lote' }
  }
}
