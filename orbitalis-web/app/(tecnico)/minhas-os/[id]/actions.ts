'use server'

import { api } from '@/lib/api'

export async function atualizarStatusOs(osId: string, status: string) {
  await api.patch(`/ordens-servico/${osId}/status`, { status })
}
