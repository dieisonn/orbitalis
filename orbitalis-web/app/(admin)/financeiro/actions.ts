'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'
import type { Resultado } from '@/lib/suprimentos'

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir')
const atualizar = () => { revalidatePath('/financeiro', 'layout') }

export type DadosLancamento = {
  tipo: 'receber' | 'pagar'; descricao: string; valor: number; vencimento: string
  categoriaId?: string; clienteId?: string; fornecedorId?: string; contaId?: string; documento?: string; observacoes?: string
  parcelas?: number; intervalo?: 'mensal' | 'quinzenal' | 'semanal'
  baixa?: { pagoEm: string; contaId?: string }
}

export async function criarLancamento(d: DadosLancamento): Promise<Resultado> {
  try { await api.post('/financeiro/lancamentos', d); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function editarLancamento(id: string, d: Partial<Omit<DadosLancamento, 'tipo' | 'parcelas' | 'intervalo' | 'baixa'>>): Promise<Resultado> {
  try { await api.patch(`/financeiro/lancamentos/${id}`, d); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function baixarLancamento(id: string, d: { pagoEm: string; valorPago?: number; contaId?: string }): Promise<Resultado> {
  try { await api.post(`/financeiro/lancamentos/${id}/baixar`, d); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function acaoLancamento(id: string, acao: 'estornar' | 'cancelar'): Promise<Resultado> {
  try { await api.post(`/financeiro/lancamentos/${id}/${acao}`, {}); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function excluirLancamento(id: string): Promise<Resultado> {
  try { await api.delete(`/financeiro/lancamentos/${id}`); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function gerarReceberDoOrcamento(id: string, vencimento?: string): Promise<Resultado> {
  try { await api.post(`/financeiro/orcamentos/${id}/gerar-receber`, vencimento ? { vencimento } : {}); atualizar(); revalidatePath('/orcamentos', 'layout'); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function salvarConta(id: string | null, d: { nome?: string; tipo?: string; saldoInicial?: number; ativa?: boolean }): Promise<Resultado> {
  try { if (id) await api.patch(`/financeiro/contas/${id}`, d); else await api.post('/financeiro/contas', d); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function salvarCategoria(id: string | null, d: { nome?: string; tipo?: string; ativa?: boolean }): Promise<Resultado> {
  try { if (id) await api.patch(`/financeiro/categorias/${id}`, d); else await api.post('/financeiro/categorias', d); atualizar(); return { ok: true } } catch (e) { return { ok: false, erro: msg(e) } }
}
