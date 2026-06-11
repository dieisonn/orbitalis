'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarPlano(
  id: string,
  data: {
    tecnicoId: string
    frequenciaDias: string
    proximaGeracao: string
    modeloChecklistId?: string
    dataFim?: string
    ativo: boolean
  },
) {
  await api.patch(`/planos-manutencao/${id}`, {
    tecnicoId: data.tecnicoId || null,
    frequenciaDias: Number(data.frequenciaDias),
    proximaGeracao: data.proximaGeracao,
    modeloChecklistId: data.modeloChecklistId || null,
    dataFim: data.dataFim || null,
    ativo: data.ativo,
  })
  redirect('/planos-manutencao')
}
