'use client'
import { useState, useTransition } from 'react'
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { registrarFinanceiro } from '@/app/(admin)/ordens-servico/financeiro-action'

type Props = {
  osId: string
  valorMaoObra: number | null
  valorPecas: number | null
}

function fmt(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceiroForm({ osId, valorMaoObra, valorPecas }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const mao  = parseFloat((fd.get('mao') as string).replace(',', '.')) || null
    const peca = parseFloat((fd.get('peca') as string).replace(',', '.')) || null
    startTransition(async () => {
      await registrarFinanceiro(osId, mao, peca)
      setOk(true)
      setTimeout(() => { setOk(false); setOpen(false) }, 1500)
    })
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
      >
        <DollarSign size={11} />
        {valorMaoObra != null || valorPecas != null ? 'Editar valores' : 'Informar valores'}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {(valorMaoObra != null || valorPecas != null) && !open && (
        <p className="text-xs text-gray-400 mt-0.5">
          M.O.: {fmt(valorMaoObra)} · Peças: {fmt(valorPecas)}
        </p>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-2 p-3 bg-gray-50 rounded-lg text-left space-y-2 w-48">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-0.5">Mão de Obra (R$)</label>
            <input
              name="mao"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valorMaoObra ?? ''}
              placeholder="0,00"
              className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-0.5">Peças (R$)</label>
            <input
              name="peca"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valorPecas ?? ''}
              placeholder="0,00"
              className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {ok ? (
            <p className="text-xs text-green-600 font-medium">Salvo!</p>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="w-full py-1.5 text-xs font-semibold bg-action text-white rounded hover:bg-action/90 disabled:opacity-60 transition-colors"
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </form>
      )}
    </div>
  )
}
