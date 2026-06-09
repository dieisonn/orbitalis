'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function deletarAmbiente(id: string) {
  await api.delete(`/ambientes/${id}`)
  redirect('/ambientes')
}
