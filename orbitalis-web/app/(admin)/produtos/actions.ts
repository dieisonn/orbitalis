'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'
import type { Resultado } from '@/lib/suprimentos'

export type DadosProduto = {
  nome: string; descricao: string; codigoInterno: string; codigoBarras: string; marca: string; categoria: string
  unidade: string; ncm: string; precoCusto: number; precoVenda: number; controlaEstoque: boolean
  estoqueMinimo: number; localizacao: string; fornecedorPadraoId: string; saldoInicial?: number
  estoqueMaximo?: number; cest?: string; origem?: number; pesoBruto?: number; pesoLiquido?: number; comissaoPercentual?: number
  despesasAcessorias?: number; outrasDespesas?: number; largura?: number; altura?: number; comprimento?: number; codBeneficio?: string; ativo?: boolean
}

export type DadosMovimento = {
  tipo: 'entrada' | 'saida' | 'ajuste'; quantidade: number; motivo: string
  custoUnitario?: number; fornecedorId?: string; documento?: string; observacao?: string
}

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir')
const limpar = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(typeof v === 'number' && Number.isNaN(v))))

export async function salvarProduto(id: string | null, dados: DadosProduto): Promise<Resultado> {
  try {
    // fornecedor vazio vira null (limpa); saldo inicial só vale no cadastro
    const { saldoInicial, ...resto } = dados
    const corpo = { ...resto, fornecedorPadraoId: dados.fornecedorPadraoId || null }
    if (id) await api.patch(`/produtos/${id}`, limpar(corpo))
    else await api.post('/produtos', limpar({ ...corpo, saldoInicial }))
    revalidatePath('/produtos'); revalidatePath('/estoque')
    return { ok: true }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function alternarProduto(id: string, ativo: boolean): Promise<Resultado> {
  try { await api.patch(`/produtos/${id}`, { ativo }); revalidatePath('/produtos'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function excluirProduto(id: string): Promise<Resultado> {
  try { await api.delete(`/produtos/${id}`); revalidatePath('/produtos'); revalidatePath('/estoque'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function movimentarProduto(id: string, dados: DadosMovimento): Promise<Resultado> {
  try {
    await api.post(`/produtos/${id}/movimentar`, limpar({ ...dados, fornecedorId: dados.fornecedorId || undefined, documento: dados.documento || undefined, observacao: dados.observacao || undefined }))
    revalidatePath('/produtos'); revalidatePath('/estoque')
    return { ok: true }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export type SelecaoProdutos = { ids?: string[]; filtro?: { q?: string; categoria?: string; ativo?: string; situacao?: string } }
export type AcaoLote = 'markup' | 'ajuste_preco' | 'ativar' | 'inativar' | 'categoria' | 'excluir'
export type ResultadoLote = { ok: true; afetados: number; ignorados: number; motivoIgnorados?: string } | { ok: false; erro: string }

export async function executarLote(sel: SelecaoProdutos, acao: AcaoLote, extra: { percentual?: number; categoria_nova?: string } = {}): Promise<ResultadoLote> {
  try {
    const corpo = limpar({ ...sel, acao, ...extra })
    const r = await api.post<{ afetados: number; ignorados: number; motivoIgnorados?: string }>('/produtos/lote', corpo)
    revalidatePath('/produtos'); revalidatePath('/estoque')
    return { ok: true, afetados: r.afetados, ignorados: r.ignorados, motivoIgnorados: r.motivoIgnorados }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export type RegraMarkup = { padrao: number; categorias: { categoria: string; percentual: number }[] }

export async function salvarMarkup(regra: RegraMarkup): Promise<Resultado> {
  try { await api.put('/produtos/markup', regra); revalidatePath('/produtos/markup'); revalidatePath('/produtos'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function produtosParaEtiquetas(sel: SelecaoProdutos): Promise<{ ok: true; produtos: import('@/lib/suprimentos').Produto[] } | { ok: false; erro: string }> {
  try { return { ok: true, produtos: await api.post('/produtos/por-selecao', limpar(sel)) } }
  catch (e) { return { ok: false, erro: msg(e) } }
}
