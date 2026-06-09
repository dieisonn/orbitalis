'use server'
import { api } from '@/lib/api'

export async function deletarCliente(id: string) {
  await api.delete(`/clientes/${id}`)
}
