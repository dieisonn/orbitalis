'use server'

import { api } from '@/lib/api'

export async function removerMembro(userId: string) {
  await api.delete(`/equipe/${userId}`)
}

export async function revogarConvite(conviteId: string) {
  await api.delete(`/convites/${conviteId}`)
}
