'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'

export async function editarCliente(
  id: string,
  data: {
    documento: string; razaoSocial: string; nomeFantasia: string; endereco: string
    telefone: string; celular: string; email: string; cidade: string; uf: string
  },
): Promise<{ error: string } | void> {
  try {
    await api.patch(`/clientes/${id}`, { ...data, documento: data.documento.replace(/\D/g, '') })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar' }
  }
  revalidatePath('/clientes')
  redirect('/clientes')
}
