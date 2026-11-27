'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'
import type { Resultado } from '@/lib/suprimentos'

export type DadosFornecedor = {
  tipoPessoa: 'F' | 'J'; razaoSocial: string; nomeFantasia: string; cpfCnpj: string; inscricaoEstadual: string
  email: string; telefone: string; celular: string; contato: string; cep: string; logradouro: string
  numeroEndereco: string; complemento: string; bairro: string; cidade: string; uf: string; observacoes: string
}

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir')

export async function salvarFornecedor(id: string | null, dados: DadosFornecedor): Promise<Resultado> {
  try {
    if (id) await api.patch(`/fornecedores/${id}`, dados)
    else await api.post('/fornecedores', dados)
    revalidatePath('/fornecedores')
    return { ok: true }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function alternarFornecedor(id: string, ativo: boolean): Promise<Resultado> {
  try { await api.patch(`/fornecedores/${id}`, { ativo }); revalidatePath('/fornecedores'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function excluirFornecedor(id: string): Promise<Resultado> {
  try { await api.delete(`/fornecedores/${id}`); revalidatePath('/fornecedores'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export type SelecaoSimples = { ids?: string[]; filtro?: { q?: string; ativo?: string } }
export type ResultadoLote = { ok: true; afetados: number; ignorados: number; motivoIgnorados?: string } | { ok: false; erro: string }

export async function executarLoteFornecedores(sel: SelecaoSimples, acao: 'ativar' | 'inativar' | 'excluir'): Promise<ResultadoLote> {
  try {
    const r = await api.post<{ afetados: number; ignorados: number }>('/fornecedores/lote', { ...sel, acao })
    revalidatePath('/fornecedores'); revalidatePath('/produtos')
    return { ok: true, afetados: r.afetados, ignorados: r.ignorados }
  } catch (e) { return { ok: false, erro: msg(e) } }
}
