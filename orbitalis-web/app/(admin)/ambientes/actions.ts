'use server'
import { api } from '@/lib/api'

export async function deletarAmbiente(id: string) {
  await api.delete(`/ambientes/${id}`)
}
