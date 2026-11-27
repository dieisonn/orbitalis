'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'
import type { Resultado } from '@/lib/suprimentos'

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir')

export async function criarInventario(d: { titulo: string; categoria: string; localizacao: string; incluirZerados: boolean; contagemCega: boolean }): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  try {
    const corpo: Record<string, unknown> = { incluirZerados: d.incluirZerados, contagemCega: d.contagemCega }
    if (d.titulo.trim()) corpo.titulo = d.titulo.trim()
    if (d.categoria) corpo.categoria = d.categoria
    if (d.localizacao.trim()) corpo.localizacao = d.localizacao.trim()
    const r = await api.post<{ id: string }>('/inventarios', corpo)
    revalidatePath('/estoque/inventarios')
    return { ok: true, id: r.id }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function contarItens(id: string, itens: { itemId: string; contado: number | null; observacao?: string }[]): Promise<Resultado> {
  try { await api.put(`/inventarios/${id}/contagem`, { itens }); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}

export async function concluirInventario(id: string, naoContados: 'manter' | 'zerar'): Promise<Resultado & { ajustados?: number }> {
  try {
    const r = await api.post<{ ajustados: number }>(`/inventarios/${id}/concluir`, { naoContados })
    revalidatePath('/estoque'); revalidatePath('/estoque/inventarios'); revalidatePath('/produtos')
    return { ok: true, ajustados: r.ajustados }
  } catch (e) { return { ok: false, erro: msg(e) } }
}

export async function cancelarInventario(id: string): Promise<Resultado> {
  try { await api.post(`/inventarios/${id}/cancelar`, {}); revalidatePath('/estoque/inventarios'); return { ok: true } }
  catch (e) { return { ok: false, erro: msg(e) } }
}
