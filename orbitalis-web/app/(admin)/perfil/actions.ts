'use server'

import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function atualizarPerfil(
  nome: string,
  telefone: string,
  especialidade: string,
  crea: string,
) {
  await api.patch('/perfil', {
    nome:         nome         || undefined,
    telefone:     telefone     || undefined,
    especialidade: especialidade || undefined,
    crea:         crea         || undefined,
  })
  revalidatePath('/perfil')
}

export async function trocarSenha(senhaAtual: string, novaSenha: string) {
  await api.post('/perfil/senha', { senhaAtual, novaSenha })
}
