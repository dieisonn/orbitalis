'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarAmbiente(
  clienteId: string,
  nome: string,
  metrosQuadrados: string,
  capacidadeTermica: string,
  localizacaoInterna: string,
) {
  await api.post('/ambientes', {
    clienteId,
    nome,
    metrosQuadrados,
    capacidadeTermica,
    localizacaoInterna,
  })
  redirect('/ambientes')
}
