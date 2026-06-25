'use client'
import { useTransition, useState } from 'react'
import { salvarThresholdsConfiabilidade } from './actions'
import { Activity } from 'lucide-react'

type Props = {
  mttrLimiteHoras: number | null
  mtbfLimiteDias: number | null
}

export function ConfiabilidadeCard({ mttrLimiteHoras, mtbfLimiteDias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const mttr = fd.get('mttrLimiteHoras')
    const mtbf = fd.get('mtbfLimiteDias')
    setError(null); setSuccess(false)
    startTransition(async () => {
      const result = await salvarThresholdsConfiabilidade(
        mttr ? Number(mttr) : null,
        mtbf ? Number(mtbf) : null,
      )
      if (!result.ok) { setError(result.error ?? 'Erro ao salvar'); return }
      setSuccess(true)
    })
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Activity size={16} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Thresholds de Confiabilidade</p>
          <p className="text-xs text-gray-400 mt-0.5">Limites para classificação de MTTR e MTBF no semáforo de risco.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite MTTR (horas)
            </label>
            <input
              name="mttrLimiteHoras"
              type="number"
              min={1}
              defaultValue={mttrLimiteHoras ?? 48}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-gray-400 mt-1">
              Vermelho se MTTR &gt; limite · Amarelo se &gt; limite/2
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite MTBF (dias)
            </label>
            <input
              name="mtbfLimiteDias"
              type="number"
              min={1}
              defaultValue={mtbfLimiteDias ?? 90}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-gray-400 mt-1">
              Vermelho se MTBF &lt; limite/2 · Amarelo se &lt; limite
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Thresholds salvos com sucesso!</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Salvando…' : 'Salvar Thresholds'}
          </button>
        </div>
      </form>
    </div>
  )
}
