'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export type TipoItemChecklist = 'texto' | 'numero' | 'escolha_unica' | 'multipla_escolha'

export type ChecklistItem = {
  id: string
  descricao: string
  obrigatorio: boolean
  tipo?: TipoItemChecklist
  unidade?: string
  opcoes?: string[]
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

export async function importarPmocSplitHiwall() {
  await api.post('/modelos-checklist/seed-pmoc-split', {})
  redirect('/checklists')
}

export async function importarAnvisa() {
  await api.post('/modelos-checklist/seed-anvisa', {})
  redirect('/checklists')
}
