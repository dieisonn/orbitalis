'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function registrarFinanceiro(osId: string, valorMaoObra: number | null, valorPecas: number | null) {
  await api.patch(`/ordens-servico/${osId}/financeiro`, {
    valorMaoObra: valorMaoObra ?? undefined,
    valorPecas: valorPecas ?? undefined,
  })
  revalidatePath('/ordens-servico')
}
