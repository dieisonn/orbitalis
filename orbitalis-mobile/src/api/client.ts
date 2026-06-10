import * as SecureStore from 'expo-secure-store'

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.45:3000/api/v1'

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('orbitalis_token')
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Erro ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  get:   <T>(path: string) => apiFetch<T>(path),
  post:  <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

export async function login(email: string, senha: string) {
  const data = await apiFetch<{ access_token: string; role: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, senha }) },
  )
  await SecureStore.setItemAsync('orbitalis_token', data.access_token)
  await SecureStore.setItemAsync('orbitalis_role', data.role)
  return data
}

export async function logout() {
  await SecureStore.deleteItemAsync('orbitalis_token')
  await SecureStore.deleteItemAsync('orbitalis_role')
}

export async function getRole(): Promise<string | null> {
  return SecureStore.getItemAsync('orbitalis_role')
}
