'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarOs(params: {
  ambienteId: string
  tecnicoId: string
  dataAgendamento: string
  observacoesGerais: string
  tipo?: string
  tipoServicoId: string
  equipamentoId: string
  horaInicio: string
  horaFim: string
}) {
  await api.post('/ordens-servico', {
    ambienteId:        params.ambienteId,
    tecnicoId:         params.tecnicoId        || undefined,
    tipoServicoId:     params.tipoServicoId    || undefined,
    equipamentoId:     params.equipamentoId    || undefined,
    origem:            'manual_admin',
    dataAgendamento:   params.dataAgendamento,
    horaInicio:        params.horaInicio       || undefined,
    horaFim:           params.horaFim          || undefined,
    observacoesGerais: params.observacoesGerais || undefined,
  })
  redirect('/ordens-servico')
}
