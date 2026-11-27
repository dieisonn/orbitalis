'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

/** Seleção de itens na lista: marcados da página ou "todos os resultados da busca". */
export function useSelecao(idsPagina: string[], total: number) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [todosFiltro, setTodosFiltro] = useState(false)
  const todosDaPagina = idsPagina.length > 0 && idsPagina.every((id) => marcados.has(id))
  return {
    marcados, todosFiltro, setTodosFiltro, todosDaPagina,
    qtd: todosFiltro ? total : marcados.size,
    marcado: (id: string) => todosFiltro || marcados.has(id),
    alternar: (id: string) => { setTodosFiltro(false); setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n }) },
    alternarTodos: () => { setTodosFiltro(false); setMarcados(todosDaPagina ? new Set() : new Set(idsPagina)) },
    limpar: () => { setMarcados(new Set()); setTodosFiltro(false) },
  }
}
export type Selecao = ReturnType<typeof useSelecao>

export function CheckSelecao({ marcado, onChange, rotulo }: { marcado: boolean; onChange: () => void; rotulo: string }) {
  return <input type="checkbox" checked={marcado} onChange={onChange} aria-label={rotulo} className="h-4 w-4 accent-[var(--color-action)]" />
}

/** Faixa que aparece com itens marcados; os botões de ação entram como filhos. */
export function BarraSelecao({ sel, total, itensNaPagina, children }: { sel: Selecao; total: number; itensNaPagina: number; children: React.ReactNode }) {
  if (sel.qtd === 0) return null
  return (
    <div className="px-4 py-3 bg-primary/5 border-b border-border space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-primary">{sel.qtd} selecionado(s)</span>
        {children}
        <button type="button" onClick={sel.limpar} className="ml-auto text-xs text-gray-600 hover:underline">Limpar seleção</button>
      </div>
      {!sel.todosFiltro && sel.todosDaPagina && total > itensNaPagina && (
        <p className="text-xs text-gray-700">Os {itensNaPagina} desta página estão marcados. <button type="button" onClick={() => sel.setTodosFiltro(true)} className="font-semibold text-primary hover:underline">Selecionar todos os {total} resultados</button></p>
      )}
      {sel.todosFiltro && <p className="text-xs text-gray-700">Todos os {total} resultados da busca estão selecionados.</p>}
    </div>
  )
}

export const botaoLote = 'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface disabled:opacity-60'
export const botaoLotePerigo = 'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-destructive bg-white border border-destructive/30 rounded-lg hover:bg-red-50'

/** Janela de confirmação de uma ação em lote. */
export function ModalLote({ titulo, qtd, destrutivo, rotuloConfirmar, pendente, erro, onFechar, onConfirmar, children }: {
  titulo: string; qtd: number; destrutivo?: boolean; rotuloConfirmar?: string; pendente: boolean; erro: string | null
  onFechar: () => void; onConfirmar: () => void; children?: React.ReactNode
}) {
  return (
    <Modal titulo={titulo} onFechar={onFechar} largura="max-w-md">
      <div className="space-y-3 text-sm">
        <p className="text-gray-700">Vale para <strong>{qtd}</strong> item(ns) selecionado(s).</p>
        {children}
        {erro && <p role="alert" className="text-destructive">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onFechar} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
          <button onClick={onConfirmar} disabled={pendente} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 ${destrutivo ? 'bg-destructive hover:bg-destructive/90' : 'bg-action hover:bg-action/90'}`}>
            {pendente && <Loader2 size={14} className="animate-spin" />} {rotuloConfirmar ?? (destrutivo ? `Excluir ${qtd}` : 'Aplicar')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function AvisoLote({ texto, onFechar }: { texto: string | null; onFechar: () => void }) {
  if (!texto) return null
  return (
    <div role="status" className="flex items-center justify-between gap-3 px-4 py-2 bg-green-50 border-b border-green-200 text-sm text-green-800">
      <span>{texto}</span><button type="button" onClick={onFechar} aria-label="Fechar aviso" className="text-green-800">×</button>
    </div>
  )
}
