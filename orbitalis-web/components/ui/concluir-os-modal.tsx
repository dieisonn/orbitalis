'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, CheckCircle, Wind } from 'lucide-react'
import { SignaturePad } from './signature-pad'
import { concluirOs } from '@/app/(admin)/ordens-servico/actions'

const TIPOS_GAS = ['R-22', 'R-32', 'R-410A', 'R-407C', 'R-134a', 'R-404A', 'R-290', 'R-600A']

type Props = {
  osId: string
  osNum: string
  onClose: () => void
}

export function ConcluirOsModal({ osId, osNum, onClose }: Props) {
  const [assinatura, setAssinatura]   = useState<string | null>(null)
  const [tipoGas, setTipoGas]         = useState('')
  const [qtdGas, setQtdGas]           = useState('')
  const [pending, startTransition]    = useTransition()
  const [error, setError]             = useState<string | null>(null)
  const router = useRouter()

  const handleSig = useCallback((b64: string | null) => setAssinatura(b64), [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await concluirOs(osId, {
        assinaturaBase64: assinatura ?? undefined,
        tipoGas: tipoGas || undefined,
        quantidadeGasGramas: qtdGas ? parseFloat(qtdGas) : undefined,
      })
      if (!result.ok) { setError(result.error ?? 'Erro ao concluir'); return }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <h2 className="font-bold text-gray-800">Concluir {osNum}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Assinatura */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assinatura do Responsável
              <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <SignaturePad onChange={handleSig} disabled={pending} />
          </div>

          {/* Dados de gás */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Wind size={14} className="text-blue-500" />
              Carga de Gás Refrigerante
              <span className="text-xs font-normal text-gray-400">(se aplicável)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de Gás</label>
                <select
                  value={tipoGas}
                  onChange={(e) => setTipoGas(e.target.value)}
                  disabled={pending}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">— Não aplicável —</option>
                  {TIPOS_GAS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantidade (gramas)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="9999"
                  value={qtdGas}
                  onChange={(e) => setQtdGas(e.target.value)}
                  disabled={pending || !tipoGas}
                  placeholder="ex: 450.0"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-surface disabled:text-gray-400"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-surface transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors">
              {pending ? 'Concluindo…' : 'Marcar como Concluída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
