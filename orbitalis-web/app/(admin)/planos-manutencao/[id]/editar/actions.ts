'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

type EquipConfig = { equipamentoId: string; modeloChecklistId: string | null }

export async function editarPlano(
  id: string,
  data: {
    tecnicoId: string
    tipoServicoId?: string
    contratoId?: string
    frequenciaDias: string
    visitasPrevistas: string
    proximaGeracao: string
    dataFim?: string
    agrupamento?: string
    maxEquipamentosPorOs?: string
    horaInicio?: string
    horaFim?: string
    ativo: boolean
    equipamentosConfig: EquipConfig[]
  },
) {
  await api.patch(`/planos-manutencao/${id}`, {
    tecnicoId: data.tecnicoId || null,
    tipoServicoId: data.tipoServicoId || null,
    contratoId: data.contratoId || null,
    frequenciaDias: Number(data.frequenciaDias),
    visitasPrevistas: Number(data.visitasPrevistas),
    proximaGeracao: data.proximaGeracao,
    dataFim: data.dataFim || null,
    agrupamento: data.agrupamento || null,
    maxEquipamentosPorOs: data.maxEquipamentosPorOs ? Number(data.maxEquipamentosPorOs) : null,
    horaInicio: data.horaInicio || null,
    horaFim: data.horaFim || null,
    ativo: data.ativo,
    equipamentosConfig: data.equipamentosConfig,
  })
  redirect(`/planos-manutencao/${id}`)
}
