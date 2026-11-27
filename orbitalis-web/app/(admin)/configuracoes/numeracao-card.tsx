'use client'
import { useState, useTransition } from 'react'
import { Hash } from 'lucide-react'
import { definirNumeracao } from './actions'

export type Numeracao = { nome: string; rotulo: string; ultimo: number; proximo: number }

function Linha({ n }: { n: Numeracao }) {
  const [valor, setValor] = useState(String(n.proximo))
  const [pendente, iniciar] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const mudou = Number(valor) !== n.proximo

  function salvar() {
    setMsg(null)
    iniciar(async () => {
      const r = await definirNumeracao(n.nome, Number(valor))
      setMsg(r.ok ? { ok: true, texto: 'Salvo' } : { ok: false, texto: r.error })
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="w-44">
        <p className="text-sm font-medium text-gray-900">{n.rotulo}</p>
        <p className="text-xs text-gray-500">{n.ultimo > 0 ? `Último número usado: ${n.ultimo}` : 'Nenhum criado ainda'}</p>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        Próximo número
        <input type="number" min={1} step={1} value={valor} onChange={(e) => setValor(e.target.value)} aria-label={`Próximo número de ${n.rotulo}`}
          className="w-32 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </label>
      <button type="button" onClick={salvar} disabled={pendente || !mudou || !(Number(valor) >= 1)}
        className="px-3 py-2 text-xs font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-40">
        {pendente ? 'Salvando…' : 'Salvar'}
      </button>
      {msg && <span role={msg.ok ? 'status' : 'alert'} className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.texto}</span>}
    </li>
  )
}

export function NumeracaoCard({ numeracoes }: { numeracoes: Numeracao[] }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Hash size={16} className="text-primary" /></div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Numeração dos documentos</p>
          <p className="text-xs text-gray-500 mt-0.5">Vindo de outro sistema? Defina em que número a contagem continua. Só é possível avançar, nunca voltar, para não repetir números já usados.</p>
        </div>
      </div>
      <ul className="divide-y divide-border">{numeracoes.map((n) => <Linha key={n.nome} n={n} />)}</ul>
    </div>
  )
}
