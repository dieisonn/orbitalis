'use server'
import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'

type R = { ok: true } | { ok: false; error: string }
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível salvar')

export async function salvarSemanaEmpresa(semana: number[]): Promise<R> {
  try { await api.put('/capacidade/jornada/empresa', { semana }); revalidatePath('/capacidade'); return { ok: true } }
  catch (e) { return { ok: false, error: msg(e) } }
}

export async function salvarSemanaTecnico(id: string, semana: number[] | null): Promise<R> {
  try { await api.put(`/capacidade/jornada/tecnico/${id}`, { semana }); revalidatePath('/capacidade'); return { ok: true } }
  catch (e) { return { ok: false, error: msg(e) } }
}

export async function criarAjuste(tecnicoId: string, data: string, minutos: number, motivo: string): Promise<R> {
  try { await api.post('/capacidade/ajustes', { tecnicoId, data, minutos, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }); revalidatePath('/capacidade'); return { ok: true } }
  catch (e) { return { ok: false, error: msg(e) } }
}

export async function removerAjuste(id: string): Promise<R> {
  try { await api.delete(`/capacidade/ajustes/${id}`); revalidatePath('/capacidade'); return { ok: true } }
  catch (e) { return { ok: false, error: msg(e) } }
}
