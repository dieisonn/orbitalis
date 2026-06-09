'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function deletarPlano(id: string) {
  await api.delete(`/planos-manutencao/${id}`)
  redirect('/planos-manutencao')
}
