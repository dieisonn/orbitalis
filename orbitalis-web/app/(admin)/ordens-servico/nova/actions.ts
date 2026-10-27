'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarOs(params: {
  clienteId: string
  ambienteId: string
  tecnicoId: string
  dataAgendamento: string
  observacoesGerais: string
  tipo?: string
  modeloChecklistId?: string
  tipoServicoId: string
  equipamentoId: string
  horaInicio: string
  horaFim: string
}) {
  await api.post('/ordens-servico', {
    // sem ambiente escolhido, a API usa o ambiente padrão "Sem local definido" do cliente
    ...(params.ambienteId ? { ambienteId: params.ambienteId } : { clienteId: params.clienteId }),
    tecnicoId:         params.tecnicoId        || undefined,
    tipo:              params.tipo             || undefined,
    modeloChecklistId: params.modeloChecklistId || undefined,
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
