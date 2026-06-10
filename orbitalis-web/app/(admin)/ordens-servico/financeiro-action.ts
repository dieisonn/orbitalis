'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function registrarFinanceiro(osId: string, valorMaoObra: number | null, valorPecas: number | null) {
  try {
    await api.patch(`/ordens-servico/${osId}/financeiro`, {
      valorMaoObra: valorMaoObra ?? undefined,
      valorPecas: valorPecas ?? undefined,
    })
    revalidatePath('/ordens-servico')
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao registrar valores' }
  }
}
