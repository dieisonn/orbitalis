'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

type EquipConfig = { equipamentoId: string; modeloChecklistId: string | null }

export async function criarPlano(data: {
  clienteId: string
  tecnicoId: string
  frequenciaDias: number
  proximaGeracao: string
  dataFim?: string
  equipamentosConfig: EquipConfig[]
}) {
  await api.post('/planos-manutencao', {
    clienteId: data.clienteId,
    tecnicoId: data.tecnicoId || undefined,
    frequenciaDias: data.frequenciaDias,
    proximaGeracao: data.proximaGeracao,
    dataFim: data.dataFim || undefined,
    ativo: true,
    equipamentosConfig: data.equipamentosConfig,
  })
  redirect('/planos-manutencao')
}
