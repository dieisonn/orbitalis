'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function excluirOs(osId: string, senha: string) {
  try {
    await api.deleteWithBody(`/ordens-servico/${osId}`, { senha })
    revalidatePath('/ordens-servico')
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao excluir' }
  }
}

/** Exclusão definitiva de várias O.S., confirmada com a senha do admin logado. */
export async function excluirOsLote(ids: string[], senha: string) {
  try {
    const r = await api.post<{ excluidas: number; ignoradas: number }>('/ordens-servico/excluir-lote', { ids, senha })
    revalidatePath('/ordens-servico')
    return { ok: true as const, excluidas: r.excluidas }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao excluir' }
  }
}

/** Junta O.S. do mesmo cliente e dia em uma visita (uma O.S., um evento), confirmado com a senha do admin. */
export async function unirOsLote(ids: string[], senha: string) {
  try {
    const r = await api.post<{ destinoId: string; unidas: number; equipamentos: number }>('/ordens-servico/unir', { ids, senha })
    revalidatePath('/ordens-servico')
    return { ok: true as const, ...r }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao unir O.S.' }
  }
}
