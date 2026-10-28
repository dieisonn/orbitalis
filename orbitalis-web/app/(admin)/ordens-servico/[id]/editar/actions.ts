'use server'

import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function editarOs(
  osId: string,
  data: {
    dataAgendamento: string
    observacoesGerais: string
    tecnicoId: string
    tipo: string
    tipoServicoId: string
    horaInicio: string
    horaFim: string
    clienteId?: string       // só enviado quando cliente/ambiente mudaram
    ambienteId?: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await api.patch(`/ordens-servico/${osId}`, {
      dataAgendamento: data.dataAgendamento,
      observacoesGerais: data.observacoesGerais || null,
      tecnicoId: data.tecnicoId || null,
      tipo: data.tipo,
      tipoServicoId: data.tipoServicoId || null,
      horaInicio: data.horaInicio || null,
      horaFim: data.horaFim || null,
      ...(data.ambienteId ? { ambienteId: data.ambienteId } : data.clienteId ? { clienteId: data.clienteId } : {}),
    })
    revalidatePath('/ordens-servico')
    revalidatePath(`/ordens-servico/${osId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao salvar' }
  }
}
