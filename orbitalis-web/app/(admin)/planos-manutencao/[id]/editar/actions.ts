'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

type EquipConfig = { equipamentoId: string; modeloChecklistId: string | null }

export async function editarPlano(
  id: string,
  data: {
    tecnicoId: string
    tipoServicoId?: string
    frequenciaDias: string
    proximaGeracao: string
    dataFim?: string
    ativo: boolean
    equipamentosConfig: EquipConfig[]
  },
) {
  await api.patch(`/planos-manutencao/${id}`, {
    tecnicoId: data.tecnicoId || null,
    tipoServicoId: data.tipoServicoId || null,
    frequenciaDias: Number(data.frequenciaDias),
    proximaGeracao: data.proximaGeracao,
    dataFim: data.dataFim || null,
    ativo: data.ativo,
    equipamentosConfig: data.equipamentosConfig,
  })
  redirect(`/planos-manutencao/${id}`)
}
