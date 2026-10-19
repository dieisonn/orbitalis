import * as SecureStore from 'expo-secure-store'

// Decodifica o payload do JWT sem verificar assinatura (apenas para exibição)
function parseJwt(token: string): Record<string, unknown> {
  try {
    // JWT usa base64url (- e _, sem padding); atob espera base64 padrão
    let payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    while (payload.length % 4) payload += '='
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

export async function getTecnicoId(): Promise<string | null> {
  const token = await SecureStore.getItemAsync('orbitalis_token')
  if (!token) return null
  const payload = parseJwt(token)
  return (payload.sub as string) ?? null
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('orbitalis_token')
  if (!token) return false
  // Verifica expiração
  const payload = parseJwt(token)
  const exp = payload.exp as number
  return exp ? Date.now() / 1000 < exp : false
}
