'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

// Módulos liberados para o usuário do escritório: '*' = acesso total (a API é quem de fato barra)
type CookieStore = Awaited<ReturnType<typeof cookies>>
function gravarAcesso(store: CookieStore, permissoes: string[] | null | undefined) {
  store.set('orbitalis_perm', Array.isArray(permissoes) ? permissoes.join(',') || '-' : '*', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

// Em produção o Next esconde o texto de erros lançados por server actions; por isso as falhas voltam como valor.
export async function login(email: string, password: string): Promise<{ error: string } | undefined> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: Array.isArray(body.message) ? body.message[0] : (body.message ?? 'Credenciais inválidas') }
  }

  const { access_token, role, permissoes } = await res.json()
  const store = await cookies()

  store.set('orbitalis_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8h — mesmo TTL do JWT
    path: '/',
  })

  store.set('orbitalis_role', role, {
    httpOnly: false, // lido no client para mostrar/ocultar elementos
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  gravarAcesso(store, permissoes)

  // Redireciona pela role diretamente no Server Action
  redirect(
    role === 'cliente' ? '/meu-painel' :
    role === 'tecnico' ? '/minhas-os' :
    '/dashboard',
  )
}

export async function registrar(
  nomeEmpresa: string,
  slug: string,
  nomeAdmin: string,
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const res = await fetch(`${BASE}/auth/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomeEmpresa, slug, nomeAdmin, email, senha: password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: Array.isArray(body.message) ? body.message[0] : (body.message ?? 'Erro ao criar conta') }
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
  gravarAcesso(store, permissoes)

  redirect('/dashboard')
}

export async function logout() {
  const store = await cookies()
  store.delete('orbitalis_token')
  store.delete('orbitalis_role')
  store.delete('orbitalis_perm')
  redirect('/login')
}

export async function getRole(): Promise<string | undefined> {
  const store = await cookies()
  return store.get('orbitalis_role')?.value
}

export async function getUserId(): Promise<string | undefined> {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value
  if (!token) return undefined
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    return payload.sub as string
  } catch {
    return undefined
  }
}

export async function getEmpresaId(): Promise<string | undefined> {
  const store = await cookies()
  const token = store.get('orbitalis_token')?.value
  if (!token) return undefined
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    return payload.empresaId as string | undefined
  } catch {
    return undefined
  }
}
