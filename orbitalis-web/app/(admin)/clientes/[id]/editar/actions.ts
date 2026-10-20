'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarCliente(
  id: string,
  data: {
    documento: string; razaoSocial: string; nomeFantasia: string; endereco: string
    telefone: string; celular: string; email: string; cidade: string; uf: string
  },
) {
  await api.patch(`/clientes/${id}`, data)
  redirect('/clientes')
}
