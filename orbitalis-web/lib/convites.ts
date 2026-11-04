'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { api } from './api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function gerarConvite(
  tipo: 'tecnico' | 'cliente',
  clienteId?: string,
): Promise<{ token: string } | { error: string }> {
  try {
    const result = await api.post<{ token: string }>('/convites', {
      tipo,
      ...(clienteId ? { clienteId } : {}),
    })
    return { token: result.token }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao gerar convite' }
  }
}

export async function aceitarConvite(
  token: string,
  nome: string,
  email: string,
  senha: string,
): Promise<{ error: string } | undefined> {
  const res = await fetch(`${BASE}/convites/${token}/aceitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: Array.isArray(body.message) ? body.message[0] : (body.message ?? 'Erro ao aceitar convite') }
  }

  const { access_token, role, permissoes } = await res.json()
  const store = await cookies()

  store.set('orbitalis_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  store.set('orbitalis_role', role, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  store.set('orbitalis_perm', Array.isArray(permissoes) ? permissoes.join(',') || '-' : '*', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  redirect(
    role === 'cliente' ? '/meu-painel' :
    role === 'tecnico' ? '/minhas-os' :
    '/dashboard',
  )
}
