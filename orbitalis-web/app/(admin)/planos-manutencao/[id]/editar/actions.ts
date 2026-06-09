'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarPlano(
  id: string,
  data: {
    tecnicoId: string
    frequenciaDias: string
    proximaGeracao: string
    ativo: boolean
  },
) {
  await api.patch(`/planos-manutencao/${id}`, {
    tecnicoId: data.tecnicoId || null,
    frequenciaDias: Number(data.frequenciaDias),
    proximaGeracao: data.proximaGeracao,
    ativo: data.ativo,
  })
  redirect('/planos-manutencao')
}
