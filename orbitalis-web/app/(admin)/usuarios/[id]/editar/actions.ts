'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarTecnico(
  id: string, email: string, senha: string,
  nome: string, telefone: string, especialidade: string,
) {
  const body: Record<string, string | undefined> = {
    email,
    nome: nome || undefined,
    telefone: telefone || undefined,
    especialidade: especialidade || undefined,
  }
  if (senha) body.senha = senha
  await api.patch(`/usuarios/${id}`, body)
  redirect('/usuarios')
}
