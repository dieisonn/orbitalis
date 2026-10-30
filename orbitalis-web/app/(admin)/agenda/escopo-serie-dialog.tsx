'use client'

import { useState } from 'react'

export type Escopo = 'este' | 'seguintes' | 'todos'

/**
 * Pergunta o alcance de uma alteração/exclusão em evento de uma série repetida
 * (como no Google Agenda): só este, este e os seguintes, ou todos.
 */
export function EscopoSerieDialog({ acao, onEscolher, onCancelar }: {
  acao: 'alterar' | 'excluir'
  onEscolher: (escopo: Escopo) => void
  onCancelar: () => void
}) {
  const [escopo, setEscopo] = useState<Escopo>('este')
  const verbo = acao === 'excluir' ? 'Excluir' : 'Alterar'
  const opcoes: { v: Escopo; rotulo: string }[] = [
    { v: 'este', rotulo: 'Somente este evento' },
    { v: 'seguintes', rotulo: 'Este e os eventos seguintes' },
    { v: 'todos', rotulo: 'Todos os eventos da série' },
  ]
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="escopo-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5">
        <h2 id="escopo-titulo" className="text-base font-bold text-gray-900 mb-3">{verbo} evento repetido</h2>
        <div className="space-y-2" role="radiogroup" aria-label="Alcance">
          {opcoes.map((o) => (
            <label key={o.v} className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer">
              <input type="radio" name="escopo" checked={escopo === o.v} onChange={() => setEscopo(o.v)} className="accent-primary" />
              {o.rotulo}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
          <button type="button" onClick={() => onEscolher(escopo)}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 ${acao === 'excluir' ? 'bg-red-700' : 'bg-primary'}`}>
            {acao === 'excluir' ? 'Excluir' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
