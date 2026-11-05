'use client'

import { Plus, Trash2 } from 'lucide-react'
import { EnderecoInput } from '@/components/ui/endereco-input'

export type EnderecoExtra = { id?: string; rotulo: string; endereco: string }

const campo = 'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'
const SUGESTOES = ['Casa', 'Loja', 'Trabalho', 'Escritório', 'Filial', 'Sítio']

/** Outros endereços do cliente, cada um com uma referência (Casa, Loja, Trabalho…). */
export function EnderecosExtras({ value, onChange, cidade, uf }: {
  value: EnderecoExtra[]; onChange: (v: EnderecoExtra[]) => void; cidade?: string | null; uf?: string | null
}) {
  const set = (i: number, parte: Partial<EnderecoExtra>) => onChange(value.map((e, j) => (j === i ? { ...e, ...parte } : e)))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="block text-sm font-medium text-gray-700">Outros endereços</span>
        <button type="button" onClick={() => onChange([...value, { rotulo: SUGESTOES[Math.min(value.length, 2)], endereco: '' }])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-action hover:underline">
          <Plus size={14} /> Adicionar endereço
        </button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-gray-500">Cliente com mais de um local (casa, loja, trabalho)? Adicione aqui e escolha o endereço na hora de criar a O.S.</p>
      )}
      {value.map((e, i) => (
        <div key={e.id ?? i} className="rounded-lg border border-border p-3 space-y-2 bg-white">
          <div className="flex items-center gap-2">
            <input list="rotulos-endereco" value={e.rotulo} maxLength={40} onChange={(ev) => set(i, { rotulo: ev.target.value })}
              placeholder="Referência (Casa, Loja, Trabalho…)" aria-label="Referência do endereço" className={`${campo} font-medium`} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover endereço"
              className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-destructive hover:bg-destructive/10">
              <Trash2 size={16} />
            </button>
          </div>
          <EnderecoInput value={e.endereco} onChange={(v) => set(i, { endereco: v })} className={campo} cidade={cidade} uf={uf}
            ariaLabel={`Endereço ${e.rotulo || i + 1}`} placeholder="Rua, número, bairro, cidade" />
        </div>
      ))}
      <datalist id="rotulos-endereco">{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  )
}
