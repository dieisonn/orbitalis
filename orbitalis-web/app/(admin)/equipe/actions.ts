'use server'

import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'

export async function redefinirSenhaMembro(userId: string) {
  try {
    const r = await api.post<{ senhaTemporaria: string; nome: string; email: string }>(`/equipe/${userId}/redefinir-senha`, {})
    return { ok: true as const, ...r }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao redefinir a senha' }
  }
}

export async function removerMembro(userId: string, transferirPara?: string) {
  try {
    await api.delete(`/equipe/${userId}${transferirPara ? `?transferirPara=${transferirPara}` : ''}`)
    revalidatePath('/equipe')
    return { ok: true as const }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao remover' }
  }
}

export type CargaMembro = { osPendentes: number; planosAtivos: number; eventosAvulsos: number; osNoCriterio?: number }
export type FiltroTransferencia = { escopo: 'pendentes' | 'todas'; de?: string; ate?: string }

function qs(f?: FiltroTransferencia) {
  if (!f) return ''
  const p = new URLSearchParams({ escopo: f.escopo })
  if (f.de) p.set('de', f.de)
  if (f.ate) p.set('ate', f.ate)
  return `?${p.toString()}`
}

export async function cargaMembro(userId: string, filtro?: FiltroTransferencia): Promise<CargaMembro | null> {
  try { return await api.get<CargaMembro>(`/equipe/${userId}/carga${qs(filtro)}`) } catch { return null }
}

// Repassa O.S. pendentes, planos preventivos e agenda para outro técnico; opcionalmente remove o acesso de quem saiu
export async function transferirOs(userId: string, paraUserId: string, remover: boolean, filtro: FiltroTransferencia = { escopo: 'pendentes' }) {
  try {
    const r = await api.post<{ osTransferidas: number; planosTransferidos: number; eventosTransferidos: number; para: string | null }>(
      `/equipe/${userId}/transferir`, { paraUserId, escopo: filtro.escopo, ...(filtro.de ? { de: filtro.de } : {}), ...(filtro.ate ? { ate: filtro.ate } : {}) })
    if (remover) {
      const rm = await removerMembro(userId)
      if ('error' in rm) return { ok: false as const, error: rm.error }
    }
    revalidatePath('/equipe')
    revalidatePath('/ordens-servico')
    return { ok: true as const, ...r }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao transferir' }
  }
}

export async function revogarConvite(conviteId: string) {
  await api.delete(`/convites/${conviteId}`)
}

type DadosAcesso = { perfilAcesso: string; permissoes: string[] }

export async function criarUsuarioEscritorio(d: DadosAcesso & { nome: string; email: string; senha: string; telefone?: string }) {
  try {
    await api.post('/equipe/usuarios', d)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao criar usuário' }
  }
}

export async function convidarUsuarioEscritorio(d: DadosAcesso & { email?: string }) {
  try {
    const r = await api.post<{ token: string }>('/convites', { tipo: 'admin', email: d.email || undefined, perfilAcesso: d.perfilAcesso, permissoes: d.permissoes })
    return { ok: true as const, token: r.token }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao gerar convite' }
  }
}

export async function atualizarAcessoUsuario(userId: string, d: DadosAcesso) {
  try {
    await api.patch(`/equipe/${userId}/acesso`, d)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao salvar acesso' }
  }
}
