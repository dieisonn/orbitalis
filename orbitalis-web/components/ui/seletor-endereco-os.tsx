'use client'

import { MapPin } from 'lucide-react'

export type EnderecoCliente = { id: string; rotulo: string; endereco: string }

/** Onde o serviço será feito, quando o cliente tem mais de um endereço. Vazio = endereço principal. */
export function SeletorEnderecoOs({ extras, principal, value, onChange }: {
  extras: EnderecoCliente[]; principal?: string; value: string; onChange: (id: string) => void
}) {
  if (!extras.length) return null
  return (
    <div>
      <label htmlFor="endereco-os" className="block text-sm font-medium text-gray-700 mb-1">
        Endereço do serviço <span className="text-xs font-normal text-gray-500">(este cliente tem mais de um)</span>
      </label>
      <div className="relative">
        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden />
        <select id="endereco-os" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="">Principal{principal ? ` — ${principal}` : ''}</option>
          {extras.map((e) => <option key={e.id} value={e.id}>{e.rotulo} — {e.endereco}</option>)}
        </select>
      </div>
    </div>
  )
}
