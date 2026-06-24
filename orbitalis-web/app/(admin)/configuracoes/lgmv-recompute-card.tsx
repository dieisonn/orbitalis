'use client'

import { useTransition, useState } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { recomputarRelatoriosLgmv } from './actions'

type Result = { ok: true; total: number; updated: number; skipped: number; erros: string[] } | { ok: false; error: string }

export function LgmvRecomputeCard() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const res = await recomputarRelatoriosLgmv()
      setResult(res)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-surface">
        <p className="text-sm font-semibold text-gray-800">Manutenção — Diagnósticos LGMV</p>
        <p className="text-xs text-gray-400 mt-0.5">Reprocessa os relatórios armazenados com os limiares de pressão atuais.</p>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-500">
          Use este botão sempre que os critérios de análise (limiares de pressão, superaquecimento, frequência) forem
          ajustados. Todos os relatórios LGMV já salvos serão recalculados sem alterar os dados brutos.
        </p>

        {result && (
          <div className={`flex flex-col gap-1 text-xs rounded-lg px-3 py-2 ${
            result.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.ok ? (
              <>
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle size={13} /> Concluído
                </div>
                <span>{result.updated} atualizados · {result.skipped} sem dados · {result.total} total</span>
                {result.erros.length > 0 && (
                  <span className="text-amber-600">{result.erros.length} erro(s): {result.erros[0]}</span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} /> {result.error}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Reprocessando…' : 'Reprocessar relatórios LGMV'}
        </button>
      </div>
    </div>
  )
}
