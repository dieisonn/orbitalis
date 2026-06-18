'use client'

import { useTransition, useState } from 'react'
import { editarOs } from './actions'
import { Wrench, ShieldCheck } from 'lucide-react'

type Tecnico = { id: string; email: string; nome: string | null }

export function EditarOsForm({
  osId,
  initialValues,
  tecnicos,
}: {
  osId: string
  initialValues: {
    dataAgendamento: string
    observacoesGerais: string | null
    tecnicoId: string | null
    tipo: string
  }
  tecnicos: Tecnico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'corretiva' | 'preventiva'>(
    initialValues.tipo === 'preventiva' ? 'preventiva' : 'corretiva',
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dataAgendamento   = fd.get('dataAgendamento')   as string
    const observacoesGerais = fd.get('observacoesGerais') as string
    const tecnicoId         = fd.get('tecnicoId')         as string

    setError(null)
    startTransition(async () => {
      try {
        await editarOs(osId, { dataAgendamento, observacoesGerais, tecnicoId, tipo })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Manutenção <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('corretiva')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              tipo === 'corretiva'
                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                : 'border-border text-gray-500 hover:bg-surface'
            }`}
          >
            <Wrench size={15} />
            Corretiva
          </button>
          <button
            type="button"
            onClick={() => setTipo('preventiva')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              tipo === 'preventiva'
                ? 'bg-action/10 border-action/40 text-action'
                : 'border-border text-gray-500 hover:bg-surface'
            }`}
          >
            <ShieldCheck size={15} />
            Preventiva
          </button>
        </div>
      </div>

      {/* Técnico */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Técnico Responsável
        </label>
        <select
          name="tecnicoId"
          defaultValue={initialValues.tecnicoId ?? ''}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">A definir na triagem…</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
          ))}
        </select>
      </div>

      {/* Data */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data de Agendamento <span className="text-destructive">*</span>
        </label>
        <input
          name="dataAgendamento"
          type="date"
          required
          defaultValue={initialValues.dataAgendamento}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          name="observacoesGerais"
          rows={4}
          defaultValue={initialValues.observacoesGerais ?? ''}
          placeholder="Descreva o serviço a ser executado ou observações relevantes…"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href={`/ordens-servico/${osId}`}
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
