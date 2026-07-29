const KEY_PREFIX = 'orbitalis_sync_'

type SyncPayload = {
  itens: {
    itemId: string
    statusItem: 'pendente' | 'concluido'
    observacoesTecnicas?: string
    checklist: unknown
  }[]
  assinaturaBase64?: string
  observacoesGerais?: string
}

export function saveLocalSync(osId: string, payload: SyncPayload): void {
  try {
    localStorage.setItem(KEY_PREFIX + osId, JSON.stringify(payload))
  } catch {}
}

export function loadLocalSync(osId: string): SyncPayload | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + osId)
    return raw ? (JSON.parse(raw) as SyncPayload) : null
  } catch {
    return null
  }
}

export function clearLocalSync(osId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + osId)
  } catch {}
}

export function hasPendingSync(osId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + osId) !== null
  } catch {
    return false
  }
}
