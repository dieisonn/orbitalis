'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Credenciais inválidas')
  }

  const { access_token, role } = await res.json()
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

  // Redireciona pela role diretamente no Server Action
  redirect(
    role === 'cliente' ? '/meus-ambientes' :
    role === 'tecnico' ? '/minhas-os' :
    '/dashboard',
  )
}

export async function logout() {
  const store = await cookies()
  store.delete('orbitalis_token')
  store.delete('orbitalis_role')
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
