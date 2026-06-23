'use server'
import { api } from '@/lib/api'

export async function criarDiagnosticoLgmv(body: {
  equipamentoId: string
  osId?: string
  dataInspecao?: string
  arquivoIduNome?: string
  arquivoOduNome?: string
  iduCsv?: string
  oduCsv?: string
}) {
  try {
    const result = await api.post<{ id: string }>('/diagnosticos-lgmv', body)
    return { ok: true as const, id: result.id }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao gerar diagnóstico.' }
  }
}

export async function atualizarDataInspecao(diagId: string, dataInspecao: string | null) {
  try {
    await api.patch(`/diagnosticos-lgmv/${diagId}`, { dataInspecao })
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao atualizar data.' }
  }
}
