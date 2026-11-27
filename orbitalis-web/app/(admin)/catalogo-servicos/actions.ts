'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'
import type { Resultado } from '@/lib/suprimentos'

export type DadosServico = { nome: string; descricao: string; unidade: string; valor: number; tipoServicoId: string; codigo: string; valorCusto: number; comissaoPercentual: number; atividadeServico: string; nbs: string }

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir')

export async function salvarServico(id: string | null, d: DadosServico): Promise<Resultado> {
  try {
    const corpo = { nome: d.nome, descricao: d.descricao, unidade: d.unidade, valor: Number.isFinite(d.valor) ? d.valor : 0, tipoServicoId: d.tipoServicoId || null, codigo: d.codigo, valorCusto: Number.isFinite(d.valorCusto) ? d.valorCusto : 0, comissaoPercentual: Number.isFinite(d.comissaoPercentual) ? d.comissaoPercentual : 0, atividadeServico: d.atividadeServico, nbs: d.nbs }
    if (id) await api.patch(`/catalogo-servicos/${id}`, corpo)
    else await api.post('/catalogo-servicos', corpo)
    revalidatePath('/catalogo-servicos')
    return { ok: true }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function alternarServico(id: string, ativo: boolean): Promise<Resultado> {
  try { await api.patch(`/catalogo-servicos/${id}`, { ativo }); revalidatePath('/catalogo-servicos'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function excluirServico(id: string): Promise<Resultado> {
  try { await api.delete(`/catalogo-servicos/${id}`); revalidatePath('/catalogo-servicos'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export type SelecaoSimples = { ids?: string[]; filtro?: { q?: string; ativo?: string } }
export type AcaoLoteServico = 'ativar' | 'inativar' | 'excluir' | 'ajuste_preco' | 'markup' | 'atividade'
export type ResultadoLote = { ok: true; afetados: number; ignorados: number; motivoIgnorados?: string } | { ok: false; erro: string }

export async function executarLoteServicos(sel: SelecaoSimples, acao: AcaoLoteServico, extra: { percentual?: number; atividade_nova?: string } = {}): Promise<ResultadoLote> {
  try {
    const corpo = Object.fromEntries(Object.entries({ ...sel, acao, ...extra }).filter(([, v]) => v !== undefined))
    const r = await api.post<{ afetados: number; ignorados: number; motivoIgnorados?: string }>('/catalogo-servicos/lote', corpo)
    revalidatePath('/catalogo-servicos')
    return { ok: true, afetados: r.afetados, ignorados: r.ignorados, motivoIgnorados: r.motivoIgnorados }
  } catch (e) { return { ok: false, erro: msg(e) } }
}
