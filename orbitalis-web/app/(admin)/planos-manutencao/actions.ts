'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function deletarPlano(id: string) {
  await api.delete(`/planos-manutencao/${id}`)
}

export async function dispararCron(planoId: string) {
  await api.post('/planos-manutencao/disparar-agora', {})
  revalidatePath(`/planos-manutencao/${planoId}`)
}
