'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function deletarEquipamento(id: string) {
  await api.delete(`/equipamentos/${id}`)
  redirect('/equipamentos')
}
