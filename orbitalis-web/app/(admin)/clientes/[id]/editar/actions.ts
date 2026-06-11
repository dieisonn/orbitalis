'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarCliente(
  id: string,
  data: { razaoSocial: string; nomeFantasia: string; endereco: string; telefone?: string },
) {
  await api.patch(`/clientes/${id}`, data)
  redirect('/clientes')
}
