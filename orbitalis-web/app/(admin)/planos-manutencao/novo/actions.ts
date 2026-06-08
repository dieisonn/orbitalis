'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarPlano(
  ambienteId: string,
  tecnicoId: string,
  frequenciaDias: number,
  proximaGeracao: string,
) {
  await api.post('/planos-manutencao', {
    ambienteId,
    tecnicoId: tecnicoId || undefined,
    frequenciaDias,
    proximaGeracao,
    ativo: true,
  })
  redirect('/planos-manutencao')
}
