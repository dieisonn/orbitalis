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
