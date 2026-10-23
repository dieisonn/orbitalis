'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export type ClienteOpcao = {
  id: string
  razaoSocial: string
  nomeFantasia?: string | null
  documento?: string | null
  cidade?: string | null
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const nomeDoCliente = (c: ClienteOpcao) => c.nomeFantasia?.trim() || c.razaoSocial
const soDigitos = (s: string) => s.replace(/\D/g, '')

/** Ordena pelo nome que aparece na tela (fantasia, senão razão social), sem diferenciar acento/caixa. */
export function ordenarClientes<T extends ClienteOpcao>(lista: T[]): T[] {
  return [...lista].sort((a, b) => nomeDoCliente(a).localeCompare(nomeDoCliente(b), 'pt-BR', { sensitivity: 'base' }))
}

/**
 * Seletor de cliente com busca: digite parte do nome, razão social, CPF/CNPJ ou cidade.
 * Lista sempre em ordem alfabética. Funciona controlado (value/onChange) ou em <form> comum (name).
 */
export function ClienteSelect({
  clientes, value, defaultValue = '', onChange, name, required, disabled, placeholder = 'Selecione o cliente…',
  vazio, ariaLabel, id, className = '',
}: {
  clientes: ClienteOpcao[]
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  vazio?: string            // texto da opção "sem filtro" (ex.: "Todos os clientes"); sem isso, não há opção vazia
  ariaLabel?: string
  id?: string
  className?: string
}) {
  const uid = useId()
  const [interno, setInterno] = useState(defaultValue)
  const atual = value ?? interno
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)

  const ordenados = useMemo(() => ordenarClientes(clientes), [clientes])
  const selecionado = ordenados.find((c) => c.id === atual) ?? null

  const filtrados = useMemo(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean)
    const digitos = soDigitos(busca)
    if (!termos.length) return ordenados
    return ordenados.filter((c) => {
      const texto = semAcento(`${c.nomeFantasia ?? ''} ${c.razaoSocial} ${c.cidade ?? ''}`)
      const doc = soDigitos(c.documento ?? '')
      return termos.every((t) => texto.includes(t)) || (digitos.length >= 3 && doc.includes(digitos))
    })
  }, [ordenados, busca])

  // linha 0 = "sem filtro" quando existir
  const itens: (ClienteOpcao | null)[] = vazio ? [null, ...filtrados] : filtrados

  function escolher(c: ClienteOpcao | null) {
    const novo = c?.id ?? ''
    if (value === undefined) setInterno(novo)
    onChange?.(novo)
    setAberto(false); setBusca('')
  }

  function abrir() {
    if (disabled) return
    setAberto(true)
    const i = itens.findIndex((c) => (c?.id ?? '') === atual)
    setAtivo(Math.max(0, i))
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberto) abrir(); else setAtivo((a) => Math.min(itens.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (aberto) setAtivo((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && aberto) { e.preventDefault(); if (itens.length) escolher(itens[Math.min(ativo, itens.length - 1)]) }
    else if (e.key === 'Escape' && aberto) { e.stopPropagation(); setAberto(false); setBusca('') }
  }

  const listaId = `${uid}-lista`
  const rotulo = selecionado ? nomeDoCliente(selecionado) : (vazio && !atual ? vazio : '')

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setAberto(false); setBusca('') } }}>
      {name && <input type="hidden" name={name} value={atual} />}
      {/* campo obrigatório "fantasma": o navegador barra o envio sem cliente e mostra o aviso */}
      {required && (
        <input tabIndex={-1} aria-hidden="true" required value={atual} onChange={() => {}} disabled={disabled}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none" />
      )}
      <div className="relative">
        <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={entrada} id={id} role="combobox" aria-expanded={aberto} aria-controls={listaId} aria-autocomplete="list"
          aria-label={ariaLabel} aria-activedescendant={aberto && itens.length ? `${uid}-op-${Math.min(ativo, itens.length - 1)}` : undefined}
          disabled={disabled} autoComplete="off" spellCheck={false}
          value={aberto ? busca : rotulo}
          placeholder={aberto ? 'Digite para buscar…' : placeholder}
          onChange={(e) => { setBusca(e.target.value); setAtivo(0); if (!aberto) setAberto(true) }}
          onFocus={abrir} onClick={() => { if (!aberto) abrir() }} onKeyDown={aoTeclar}
          className={`w-full pl-9 pr-14 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 ${className}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {atual && !vazio && !required && !disabled && (
            <button type="button" aria-label="Limpar cliente" onClick={() => { escolher(null); entrada.current?.focus() }}
              className="p-1 text-gray-500 hover:text-gray-800"><X size={13} /></button>
          )}
          <ChevronDown size={15} aria-hidden="true" className="text-gray-500 pointer-events-none" />
        </div>
      </div>

      {aberto && (
        <ul id={listaId} role="listbox" aria-label="Clientes"
          className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
          {itens.length === 0 && <li className="px-3 py-3 text-sm text-gray-600">Nenhum cliente encontrado para “{busca}”.</li>}
          {itens.map((c, i) => {
            const sel = (c?.id ?? '') === atual
            return (
              <li key={c?.id ?? 'vazio'} id={`${uid}-op-${i}`} role="option" aria-selected={sel}
                onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(c)} onMouseMove={() => setAtivo(i)}
                className={`px-3 py-2 cursor-pointer text-sm ${i === ativo ? 'bg-primary/8 bg-gray-100' : ''} ${sel ? 'font-semibold text-primary' : 'text-gray-900'}`}>
                {c === null ? <span className="text-gray-700">{vazio}</span> : (
                  <>
                    <span className="block truncate">{nomeDoCliente(c)}</span>
                    {(c.nomeFantasia?.trim() || c.cidade) && (
                      <span className="block truncate text-xs font-normal text-gray-600">
                        {[c.nomeFantasia?.trim() ? c.razaoSocial : null, c.cidade].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
