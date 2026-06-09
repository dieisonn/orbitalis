'use server'
import { api } from '@/lib/api'

export async function deletarEquipamento(id: string) {
  await api.delete(`/equipamentos/${id}`)
}
