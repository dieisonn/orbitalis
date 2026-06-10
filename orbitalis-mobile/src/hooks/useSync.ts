import { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { db } from '../db/database'
import { api } from '../api/client'

// Hook que monitora a rede e carrega/sincroniza a agenda do técnico (§6.3)
export function useNetworkSync(tecnicoId: string | null) {
  const syncing = useRef(false)

  useEffect(() => {
    if (!tecnicoId) return

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || syncing.current) return
      syncing.current = true
      try {
        await sincronizarAgenda(tecnicoId)
      } finally {
        syncing.current = false
      }
    })

    // Primeira carga imediata
    sincronizarAgenda(tecnicoId).catch(() => {})

    return unsubscribe
  }, [tecnicoId])
}

async function sincronizarAgenda(tecnicoId: string) {
  try {
    const ordens = await api.get<OsRemota[]>(`/ordens-servico/tecnico/${tecnicoId}`)
    for (const os of ordens) {
      db.runSync(
        `INSERT OR REPLACE INTO ordens_servico
         (id, ambiente_nome, status, origem, data_agendamento, sincronizado)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [os.id, os.ambiente?.nome ?? '', os.status, os.origem, os.dataAgendamento],
      )
      for (const item of os.itens ?? []) {
        db.runSync(
          `INSERT OR REPLACE INTO os_itens
           (id, ordem_servico_id, equipamento_id, equipamento_nome, equipamento_qr,
            status_item, checklist_snapshot, sincronizado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            item.id,
            os.id,
            item.equipamento.id,
            item.equipamento.nome,
            item.equipamento.codigoQr,
            item.statusItem,
            JSON.stringify(item.checklistSnapshot),
          ],
        )
      }
    }
  } catch {
    // Offline — usa dados locais
  }
}

type OsRemota = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  ambiente: { nome: string }
  itens: {
    id: string
    statusItem: string
    checklistSnapshot: Record<string, unknown>
    equipamento: { id: string; nome: string; codigoQr: string }
  }[]
}
