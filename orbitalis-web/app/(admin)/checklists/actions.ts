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

export type CasoChecklist = {
  tipo: 'preventiva' | 'corretiva' | null
  tipoServicoId: string | null
}

export async function criarChecklist(nome: string, itens: ChecklistItem[], caso: CasoChecklist) {
  await api.post('/modelos-checklist', { nome, itens, tipo: caso.tipo, tipoServicoId: caso.tipoServicoId })
  redirect('/checklists')
}

export async function atualizarChecklist(id: string, nome: string, itens: ChecklistItem[], caso: CasoChecklist) {
  await api.put(`/modelos-checklist/${id}`, { nome, itens, tipo: caso.tipo, tipoServicoId: caso.tipoServicoId })
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

export async function importarCorretiva() {
  await api.post('/modelos-checklist/seed-corretiva', {})
  redirect('/checklists')
}

export async function importarAnvisa() {
  await api.post('/modelos-checklist/seed-anvisa', {})
  redirect('/checklists')
}
