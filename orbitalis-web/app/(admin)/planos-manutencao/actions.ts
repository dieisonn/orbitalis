'use server'
import { api } from '@/lib/api'

export async function deletarPlano(id: string) {
  await api.delete(`/planos-manutencao/${id}`)
}
