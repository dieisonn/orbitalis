'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export type ChecklistItem = {
  id: string
  descricao: string
  obrigatorio: boolean
}

export async function criarChecklist(nome: string, itens: ChecklistItem[]) {
  await api.post('/modelos-checklist', { nome, itens })
  redirect('/checklists')
}

export async function atualizarChecklist(id: string, nome: string, itens: ChecklistItem[]) {
  await api.put(`/modelos-checklist/${id}`, { nome, itens })
  redirect('/checklists')
}

export async function deletarChecklist(id: string) {
  await api.delete(`/modelos-checklist/${id}`)
  redirect('/checklists')
}
