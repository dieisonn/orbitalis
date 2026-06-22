'use client'

import { useState, useTransition } from 'react'
import { UserCog, Check } from 'lucide-react'
import { salvarResponsavelTecnico } from './actions'

type Tecnico = { id: string; email: string; nome: string | null; crea: string | null }

type Props = {
  tecnicos: Tecnico[]
  responsavelTecnicoId: string | null
  responsavelTecnico: { id: string; nome: string | null; email: string; crea: string | null } | null
}

export function ResponsavelTecnicoCard({ tecnicos, responsavelTecnicoId, responsavelTecnico }: Props) {
  const [selected, setSelected] = useState(responsavelTecnicoId ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await salvarResponsavelTecnico(selected || null)
      if (!result.ok) { setError(result.error ?? 'Erro ao salvar'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const tecnicoAtual = tecnicos.find((t) => t.id === selected)

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <UserCog size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Responsável Técnico</p>
          <p className="text-xs text-gray-400">Aparece nos relatórios PMOC como responsável pela execução</p>
        </div>
      </div>

      <div className="space-y-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Nenhum responsável definido</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome ?? t.email}{t.crea ? ` — CREA ${t.crea}` : ''}
            </option>
          ))}
        </select>

        {tecnicoAtual?.crea && (
          <p className="text-xs text-gray-500">
            CREA: <span className="font-mono font-semibold">{tecnicoAtual.crea}</span>
          </p>
        )}
        {tecnicoAtual && !tecnicoAtual.crea && (
          <p className="text-xs text-amber-600">
            Este técnico não possui CREA cadastrado.{' '}
            <a href={`/usuarios/${tecnicoAtual.id}/editar`} className="underline font-semibold">
              Adicionar CREA
            </a>
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-2 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saved ? (
            <><Check size={14} /> Salvo!</>
          ) : isPending ? 'Salvando…' : 'Salvar Responsável Técnico'}
        </button>
      </div>
    </div>
  )
}
