'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

// continuar = true: mantém a pessoa no formulário para cadastrar o próximo ambiente do mesmo cliente
export async function criarAmbiente(
  clienteId: string,
  nome: string,
  metrosQuadrados: string,
  capacidadeTermica: string,
  localizacaoInterna: string,
  continuar = false,
) {
  await api.post('/ambientes', {
    clienteId,
    nome,
    metrosQuadrados,
    capacidadeTermica,
    localizacaoInterna,
  })
  if (!continuar) redirect('/ambientes')
}
