'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Check } from 'lucide-react'
import { salvarConfigAlertas } from './actions'

type Config = {
  osSemAtualizacaoDias: number
  equipamentoCorretivasMes: number
  contratoVencendoDias: number
  planoVencendoDias: number
} | null

export function AlertaConfigForm({ config }: { config: Config }) {
  const [osDias, setOsDias]         = useState(String(config?.osSemAtualizacaoDias ?? 3))
  const [eqCorr, setEqCorr]         = useState(String(config?.equipamentoCorretivasMes ?? 3))
  const [ctDias, setCtDias]         = useState(String(config?.contratoVencendoDias ?? 30))
  const [plDias, setPlDias]         = useState(String(config?.planoVencendoDias ?? 30))
  const [pending, startTransition]  = useTransition()
  const [saved, setSaved]           = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await salvarConfigAlertas({
        osSemAtualizacaoDias:    parseInt(osDias) || 3,
        equipamentoCorretivasMes: parseInt(eqCorr) || 3,
        contratoVencendoDias:    parseInt(ctDias) || 30,
        planoVencendoDias:       parseInt(plDias) || 30,
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); router.refresh() }, 1500)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-gray-800">Limiares de Alerta</h2>
          <p className="text-xs text-gray-400">O cron avalia as regras diariamente às 07:00</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'O.S. em andamento sem atualização (dias)', value: osDias, set: setOsDias, min: 1, max: 30 },
          { label: 'Equipamento reincidente (N+ corretivas em 6 meses)', value: eqCorr, set: setEqCorr, min: 1, max: 20 },
          { label: 'Contrato vencendo — alertar com antecedência (dias)', value: ctDias, set: setCtDias, min: 7, max: 180 },
          { label: 'Plano de manutenção vencendo — antecedência (dias)', value: plDias, set: setPlDias, min: 7, max: 180 },
        ].map(({ label, value, set, min, max }) => (
          <div key={label}>
            <label className="block text-sm text-gray-600 mb-1">{label}</label>
            <input
              type="number" min={min} max={max} value={value}
              onChange={(e) => set(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        ))}

        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2">
          {saved ? <><Check size={14} /> Salvo!</> : pending ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </form>
    </div>
  )
}
