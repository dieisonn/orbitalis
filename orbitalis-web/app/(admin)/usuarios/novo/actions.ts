'use server'
import { api } from '@/lib/api'
import { redirect } from 'next/navigation'

export async function criarTecnico(
  email: string, senha: string,
  nome: string, telefone: string, especialidade: string, crea: string,
) {
  try {
    await api.post('/usuarios', {
      email, senha,
      nome: nome || undefined,
      telefone: telefone || undefined,
      especialidade: especialidade || undefined,
      crea: crea || undefined,
    })
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao criar técnico' }
  }
  redirect('/usuarios')
}
