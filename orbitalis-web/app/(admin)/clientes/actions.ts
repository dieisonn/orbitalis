'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function deletarCliente(id: string) {
  await api.delete(`/clientes/${id}`)
  redirect('/clientes')
}
