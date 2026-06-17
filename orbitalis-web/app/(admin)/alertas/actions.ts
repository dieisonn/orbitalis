'use server'
import { api } from '@/lib/api'

export async function resolverAlerta(id: string) {
  try {
    await api.patch(`/alertas/${id}/resolver`, {})
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro' }
  }
}

export async function salvarConfigAlertas(config: {
  osSemAtualizacaoDias: number
  equipamentoCorretivasMes: number
  contratoVencendoDias: number
  planoVencendoDias: number
}) {
  try {
    await api.patch('/alertas/config', config)
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro' }
  }
}
