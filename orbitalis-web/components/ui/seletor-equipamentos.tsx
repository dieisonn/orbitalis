'use client'

import { useState } from 'react'

export type EquipamentoOpcao = { id: string; nome: string; tipoEquipamento?: string }

/** Escolha de vários equipamentos de um ambiente (caixas de seleção, com busca quando a lista é grande). */
export function SeletorEquipamentos({
  equipamentos, selecionados, onChange, travados = [],
}: {
  equipamentos: EquipamentoOpcao[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  /** Equipamentos que não podem ser desmarcados (técnico já executou ou anotou) */
  travados?: string[]
}) {
  const [busca, setBusca] = useState('')
  const sel = new Set(selecionados)
  const bloqueado = new Set(travados)
  const visiveis = equipamentos.filter((e) => `${e.nome} ${e.tipoEquipamento ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))

  const alternar = (id: string) => {
    if (bloqueado.has(id)) return
    onChange(sel.has(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id])
  }

  return (
    <div className="border border-border rounded-lg bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <span className="text-xs text-gray-600"><b className="text-gray-900">{selecionados.length}</b> de {equipamentos.length} selecionado{selecionados.length !== 1 ? 's' : ''}</span>
        <span className="flex gap-3 text-xs">
          <button type="button" onClick={() => onChange(equipamentos.map((e) => e.id))} className="text-primary font-semibold hover:underline">Todos</button>
          <button type="button" onClick={() => onChange(equipamentos.filter((e) => bloqueado.has(e.id)).map((e) => e.id))} className="text-gray-600 hover:underline">Nenhum</button>
        </span>
      </div>
      {equipamentos.length > 8 && (
        <div className="px-3 pt-2">
          <input
            type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipamento…" aria-label="Buscar equipamento"
            className="w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
      <ul className="max-h-60 overflow-y-auto py-1">
        {visiveis.length === 0 && <li className="px-3 py-3 text-xs text-gray-500">Nenhum equipamento encontrado.</li>}
        {visiveis.map((e) => (
          <li key={e.id}>
            <label className={`flex items-center gap-3 px-3 py-2 text-sm ${bloqueado.has(e.id) ? 'opacity-70' : 'cursor-pointer hover:bg-surface'}`}>
              <input
                type="checkbox" checked={sel.has(e.id)} disabled={bloqueado.has(e.id)} onChange={() => alternar(e.id)}
                className="h-4 w-4 rounded border-border accent-[var(--color-action)]"
              />
              <span className="flex-1 min-w-0 truncate text-gray-800">{e.nome}</span>
              {e.tipoEquipamento && <span className="text-xs text-gray-500 shrink-0">{e.tipoEquipamento}</span>}
              {bloqueado.has(e.id) && <span className="text-[11px] text-gray-500 shrink-0">já executado</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
