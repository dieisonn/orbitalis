'use server'

import { api } from '@/lib/api'

export async function removerMembro(userId: string) {
  await api.delete(`/equipe/${userId}`)
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
