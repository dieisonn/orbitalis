'use server'
import { api } from '@/lib/api'

export async function deletarUsuario(id: string) {
  await api.delete(`/usuarios/${id}`)
}
