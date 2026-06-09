'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarTecnico(email: string, senha: string) {
  await api.post('/usuarios', { email, senha })
  redirect('/usuarios')
}
