'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { EnderecoInput } from '@/components/ui/endereco-input'
import { criarClienteRapido, type AmbienteCriado, type ClienteCriado } from '@/app/(admin)/clientes/rapido-actions'

const campo = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40'

/** Cadastro rápido de cliente (e, opcionalmente, do primeiro ambiente) sem sair da tela atual. */
export function ClienteRapidoModal({ nomeInicial = '', comAmbiente = false, onCriado, onFechar }: {
  nomeInicial?: string
  comAmbiente?: boolean
  onCriado: (r: { cliente: ClienteCriado; ambiente: AmbienteCriado | null }) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState(nomeInicial)
  const [documento, setDocumento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [ambNome, setAmbNome] = useState('Principal')
  const [ambLocal, setAmbLocal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const primeiro = useRef<HTMLInputElement>(null)

  useEffect(() => {
    primeiro.current?.focus()
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onFechar() } }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onFechar])

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    const doc = documento.replace(/\D/g, '')
    if (nome.trim().length < 2) return setErro('Informe o nome do cliente.')
    if (endereco.trim().length < 5) return setErro('Informe o endereço (mínimo 5 caracteres).')
    if (doc && doc.length !== 11 && doc.length !== 14) return setErro('CPF tem 11 dígitos e CNPJ tem 14.')
    setErro(null)
    startTransition(async () => {
      try {
        onCriado(await criarClienteRapido(
          { razaoSocial: nome, documento: doc, telefone, endereco },
          comAmbiente ? { nome: ambNome, localizacaoInterna: ambLocal } : undefined,
        ))
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível cadastrar o cliente.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      {/* form fora do formulário da página: o modal é um portal lógico, mas o <form> é próprio */}
      <div role="dialog" aria-modal="true" aria-labelledby="cr-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 id="cr-titulo" className="text-base font-bold text-gray-900">Cadastrar novo cliente</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-4">Só o essencial agora; o restante você completa depois em Clientes.</p>
        <div className="space-y-3" role="group">
          <div>
            <label htmlFor="cr-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome / Razão social <span className="text-destructive">*</span></label>
            <input id="cr-nome" ref={primeiro} value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cr-doc" className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
              <input id="cr-doc" value={documento} inputMode="numeric" onChange={(e) => setDocumento(e.target.value)} placeholder="Opcional" className={campo} />
            </div>
            <div>
              <label htmlFor="cr-tel" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input id="cr-tel" value={telefone} inputMode="tel" onChange={(e) => setTelefone(e.target.value)} placeholder="Opcional" className={campo} />
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Endereço <span className="text-destructive">*</span></span>
            <EnderecoInput value={endereco} onChange={setEndereco} className={campo} ariaLabel="Endereço do cliente" placeholder="Rua, número, bairro, cidade" />
          </div>
          {comAmbiente && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
              <div>
                <label htmlFor="cr-amb" className="block text-sm font-medium text-gray-700 mb-1 mt-3">Ambiente</label>
                <input id="cr-amb" value={ambNome} onChange={(e) => setAmbNome(e.target.value)} className={campo} />
              </div>
              <div>
                <label htmlFor="cr-loc" className="block text-sm font-medium text-gray-700 mb-1 mt-3">Localização</label>
                <input id="cr-loc" value={ambLocal} onChange={(e) => setAmbLocal(e.target.value)} placeholder="Igual ao endereço" className={campo} />
              </div>
            </div>
          )}
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
