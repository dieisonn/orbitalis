'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarTecnico(
  email: string, senha: string,
  nome: string, telefone: string, especialidade: string,
) {
  await api.post('/usuarios', {
    email, senha,
    nome: nome || undefined,
    telefone: telefone || undefined,
    especialidade: especialidade || undefined,
  })
  redirect('/usuarios')
}
