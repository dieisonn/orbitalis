'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { criarAmbienteRapido, type AmbienteCriado } from '@/app/(admin)/clientes/rapido-actions'

const campo = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40'

/** Cadastro rápido de ambiente de um cliente, sem sair da tela atual (a O.S. em andamento é preservada). */
export function AmbienteRapidoModal({ clienteId, clienteNome, onCriado, onFechar }: {
  clienteId: string
  clienteNome: string
  onCriado: (a: AmbienteCriado) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState('')
  const [local, setLocal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const primeiro = useRef<HTMLInputElement>(null)

  useEffect(() => {
    primeiro.current?.focus()
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onFechar() } }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onFechar])

  function salvar() {
    if (nome.trim().length < 2) return setErro('Informe o nome do ambiente.')
    setErro(null)
    startTransition(async () => {
      try {
        onCriado(await criarAmbienteRapido(clienteId, { nome, localizacaoInterna: local }))
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível cadastrar o ambiente.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ar-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 id="ar-titulo" className="text-base font-bold text-gray-900">Cadastrar ambiente</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-4">Cliente: <strong>{clienteNome}</strong>. O restante você completa depois em Ambientes.</p>
        <div className="space-y-3" role="group">
          <div>
            <label htmlFor="ar-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome do ambiente <span className="text-destructive">*</span></label>
            <input id="ar-nome" ref={primeiro} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sala de reunião" className={campo}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvar() } }} />
          </div>
          <div>
            <label htmlFor="ar-loc" className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
            <input id="ar-loc" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: 2º andar (opcional)" className={campo}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvar() } }} />
          </div>
        </div>
        {erro && <p role="alert" className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
          <button type="button" onClick={salvar} disabled={pendente}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
            {pendente && <Loader2 size={14} className="animate-spin" />} Cadastrar e usar
          </button>
        </div>
      </div>
    </div>
  )
}
