import { db } from './database'
import { api } from '../api/client'

// Sincronização offline-first (§6.3)
// Despacha a fila de alterações pendentes quando há internet

export type OsItemPayload = {
  itemId: string
  statusItem: 'pendente' | 'concluido'
  observacoesTecnicas?: string
  checklist: Record<string, unknown>
}

export type SyncPayload = {
  itens: OsItemPayload[]
  assinaturaUrl?: string
  observacoesGerais?: string
}

export async function salvarItemOffline(
  osId: string,
  itemId: string,
  statusItem: 'pendente' | 'concluido',
  checklist: Record<string, unknown>,
  observacoesTecnicas?: string,
) {
  // Atualiza o item localmente com flag sincronizado = 0
  db.runSync(
    `UPDATE os_itens
     SET status_item = ?, checklist_snapshot = ?, observacoes_tecnicas = ?, sincronizado = 0
     WHERE id = ?`,
    [statusItem, JSON.stringify(checklist), observacoesTecnicas ?? null, itemId],
  )
}

export async function despacharFila(osId: string): Promise<boolean> {
  // Monta o payload com todos os itens pendentes de sync da O.S.
  const itens = db.getAllSync<{
    id: string
    status_item: string
    checklist_snapshot: string
    observacoes_tecnicas: string | null
  }>(
    `SELECT id, status_item, checklist_snapshot, observacoes_tecnicas
     FROM os_itens WHERE ordem_servico_id = ? AND sincronizado = 0`,
    [osId],
  )

  if (itens.length === 0) return true

  const payload: SyncPayload = {
    itens: itens.map((i) => ({
      itemId: i.id,
      statusItem: i.status_item as 'pendente' | 'concluido',
      observacoesTecnicas: i.observacoes_tecnicas ?? undefined,
      checklist: JSON.parse(i.checklist_snapshot),
    })),
  }

  try {
    await api.patch(`/ordens-servico/${osId}/sincronizar`, payload)

    // Marca todos como sincronizados
    db.runSync(
      `UPDATE os_itens SET sincronizado = 1 WHERE ordem_servico_id = ?`,
      [osId],
    )
    db.runSync(
      `UPDATE ordens_servico SET sincronizado = 1 WHERE id = ?`,
      [osId],
    )
    return true
  } catch (err: unknown) {
    // 409 Conflict: Admin cancelou (§6.4) — salva na fila de auditoria local
    if (err instanceof Error && err.message.includes('409')) {
      db.runSync(
        `INSERT INTO fila_sync (os_id, payload) VALUES (?, ?)`,
        [osId, JSON.stringify(payload)],
      )
    }
    return false
  }
}

export function carregarAgendaLocal() {
  return db.getAllSync<{
    id: string
    ambiente_nome: string
    status: string
    origem: string
    data_agendamento: string
    data_inicio: string | null
    sincronizado: number
  }>(
    `SELECT * FROM ordens_servico WHERE status IN ('aberta','em_andamento') ORDER BY data_agendamento ASC`,
  )
}

export function carregarItensOs(osId: string) {
  return db.getAllSync<{
    id: string
    equipamento_nome: string
    equipamento_qr: string
    status_item: string
    checklist_snapshot: string
    observacoes_tecnicas: string | null
  }>(
    `SELECT * FROM os_itens WHERE ordem_servico_id = ? ORDER BY equipamento_nome ASC`,
    [osId],
  )
}
