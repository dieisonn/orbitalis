'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarTecnico(
  id: string,
  email: string,
  senha: string,
) {
  const body: Record<string, string> = { email }
  if (senha) body.senha = senha
  await api.patch(`/usuarios/${id}`, body)
  redirect('/usuarios')
}
