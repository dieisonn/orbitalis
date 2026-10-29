'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

type EquipConfig = { equipamentoId: string; modeloChecklistId: string | null }

export async function criarPlano(data: {
  clienteId: string
  tecnicoId: string
  tipoServicoId?: string
  contratoId?: string
  frequenciaDias: number
  visitasPrevistas: number
  proximaGeracao: string
  dataFim?: string
  agrupamento?: string
  maxEquipamentosPorOs?: string
  horaInicio?: string
  horaFim?: string
  equipamentosConfig: EquipConfig[]
}) {
  await api.post('/planos-manutencao', {
    clienteId: data.clienteId,
    tecnicoId: data.tecnicoId || undefined,
    tipoServicoId: data.tipoServicoId || undefined,
    contratoId: data.contratoId || undefined,
    frequenciaDias: data.frequenciaDias,
    visitasPrevistas: data.visitasPrevistas,
    proximaGeracao: data.proximaGeracao,
    dataFim: data.dataFim || undefined,
    agrupamento: data.agrupamento || undefined,
    maxEquipamentosPorOs: data.maxEquipamentosPorOs ? Number(data.maxEquipamentosPorOs) : undefined,
    horaInicio: data.horaInicio || undefined,
    horaFim: data.horaFim || undefined,
    ativo: true,
    equipamentosConfig: data.equipamentosConfig,
  })
  redirect('/planos-manutencao')
}
