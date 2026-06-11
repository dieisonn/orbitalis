'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function deletarPlano(id: string) {
  await api.delete(`/planos-manutencao/${id}`)
}

export async function gerarOsPlano(planoId: string) {
  await api.post(`/planos-manutencao/${planoId}/gerar-os`, {})
  revalidatePath(`/planos-manutencao/${planoId}`)
}
