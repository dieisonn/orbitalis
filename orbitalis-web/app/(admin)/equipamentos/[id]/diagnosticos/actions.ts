'use server'
import { api } from '@/lib/api'

export async function criarDiagnosticoLgmv(body: {
  equipamentoId: string
  osId?: string
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
