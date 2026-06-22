'use client'

import { useTransition, useState, useMemo } from 'react'
import { editarPlano } from './actions'
import { Building2 } from 'lucide-react'

const FREQUENCIAS = [
  { label: 'Mensal (30 dias)',      value: 30 },
  { label: 'Bimestral (60 dias)',   value: 60 },
  { label: 'Trimestral (90 dias)',  value: 90 },
  { label: 'Semestral (180 dias)',  value: 180 },
  { label: 'Anual (365 dias)',      value: 365 },
]

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  numeroSerie: string | null
}

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  clienteId: string
  equipamentos: Equipamento[]
}

type EquipConfigAtual = {
  equipamentoId: string
  modeloChecklistId: string | null
  equipamento: { id: string; nome: string; tipoEquipamento: string; ambienteId: string }
  modeloChecklist: { id: string; nome: string } | null
}

type Tecnico   = { id: string; email: string; nome: string | null }
type Checklist   = { id: string; nome: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

type Props = {
  id: string
  clienteLabel: string
  tecnicoId: string | null
  tipoServicoId: string | null
  frequenciaDias: number
  proximaGeracao: string
  dataFim: string | null
  ativo: boolean
  equipamentosConfigAtual: EquipConfigAtual[]
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
  checklists: Checklist[]
  tiposServico: TipoServico[]
}

export function EditarPlanoForm({
  id,
  clienteLabel,
  tecnicoId,
  tipoServicoId: tipoServicoIdInicial,
  frequenciaDias,
  proximaGeracao,
  dataFim,
  ativo,
  equipamentosConfigAtual,
  ambientes,
  tecnicos,
  checklists,
  tiposServico,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isAtivo, setIsAtivo] = useState(ativo)
  const [tipoServicoId, setTipoServicoId] = useState(tipoServicoIdInicial ?? '')

  // Inicializa com a config atual: { equipamentoId: checklistId | '' }
  const configInicial = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of equipamentosConfigAtual) {
      map[c.equipamentoId] = c.modeloChecklistId ?? ''
    }
    return map
  }, [equipamentosConfigAtual])

  const [checklistPorEquip, setChecklistPorEquip] = useState<Record<string, string>>(configInicial)
  // Track quais equipamentos estão incluídos no plano
  const [includidos, setIncludidos] = useState<Set<string>>(
    () => new Set(equipamentosConfigAtual.map((c) => c.equipamentoId))
  )

  const proxDate = proximaGeracao ? proximaGeracao.split('T')[0] : ''
  const fimDate  = dataFim        ? dataFim.split('T')[0]        : ''

  function toggleEquip(equipamentoId: string) {
    setIncludidos((prev) => {
      const next = new Set(prev)
      if (next.has(equipamentoId)) next.delete(equipamentoId)
      else {
        next.add(equipamentoId)
        if (!checklistPorEquip[equipamentoId]) {
          setChecklistPorEquip((c) => ({ ...c, [equipamentoId]: '' }))
        }
      }
      return next
    })
  }

  function setChecklist(equipamentoId: string, checklistId: string) {
    setChecklistPorEquip((prev) => ({ ...prev, [equipamentoId]: checklistId }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const equipamentosConfig = Array.from(includidos).map((equipamentoId) => ({
      equipamentoId,
      modeloChecklistId: checklistPorEquip[equipamentoId] || null,
    }))

    setError(null)
    startTransition(async () => {
      try {
        await editarPlano(id, {
          tecnicoId:         fd.get('tecnicoId') as string,
          tipoServicoId,
          frequenciaDias:    fd.get('frequenciaDias') as string,
          proximaGeracao:    fd.get('proximaGeracao') as string,
          dataFim:           fd.get('dataFim') as string,
          ativo: isAtivo,
          equipamentosConfig,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Configurações ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Configurações — {clienteLabel}</h2>

        {tiposServico.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Serviço</label>
            <div className="flex flex-wrap gap-2">
              {tiposServico.map((ts) => (
                <button
                  key={ts.id}
                  type="button"
                  onClick={() => setTipoServicoId(tipoServicoId === ts.id ? '' : ts.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    tipoServicoId === ts.id ? 'border-transparent text-white' : 'border-border text-gray-600 hover:bg-surface'
                  }`}
                  style={tipoServicoId === ts.id ? { backgroundColor: ts.corHex } : {}}
                >
                  <span
                    className="w-6 text-center py-0.5 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: tipoServicoId === ts.id ? 'rgba(255,255,255,0.25)' : ts.corHex }}
                  >
                    {ts.sigla}
                  </span>
                  {ts.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Técnico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsável</label>
            <select name="tecnicoId" defaultValue={tecnicoId ?? ''}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
              <option value="">A definir…</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
              ))}
            </select>
          </div>

          {/* Frequência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequência <span className="text-destructive">*</span>
            </label>
            <select name="frequenciaDias" required defaultValue={frequenciaDias}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
              {FREQUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Próxima geração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Próxima Geração <span className="text-destructive">*</span>
            </label>
            <input name="proximaGeracao" type="date" required defaultValue={proxDate}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          {/* Data fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite</label>
            <input name="dataFim" type="date" defaultValue={fimDate}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        {/* Toggle ativo */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => setIsAtivo((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAtivo ? 'bg-action' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAtivo ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {isAtivo ? 'Plano ativo — gera O.S. automaticamente' : 'Plano inativo'}
          </span>
        </div>
      </div>

      {/* ── Equipamentos ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Equipamentos e Checklists</h2>
          <span className="text-xs text-gray-400">{includidos.size} incluído(s)</span>
        </div>

        {ambientes.length === 0 ? (
          <p className="text-sm text-gray-400 italic p-6">Nenhum ambiente cadastrado para este cliente.</p>
        ) : (
          ambientes.map((a) => (
            a.equipamentos.length === 0 ? null : (
              <div key={a.id}>
                <div className="px-5 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
                  <Building2 size={12} className="text-primary/70 shrink-0" />
                  <span className="text-xs font-bold text-primary">{a.nome}</span>
                  <span className="text-xs text-gray-400">{a.localizacaoInterna}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {a.equipamentos.map((eq) => {
                      const isIn = includidos.has(eq.id)
                      return (
                        <tr key={eq.id} className={`transition-colors ${isIn ? 'hover:bg-surface/50' : 'opacity-50'}`}>
                          <td className="px-5 py-3 w-10">
                            <input type="checkbox" checked={isIn} onChange={() => toggleEquip(eq.id)}
                              className="w-4 h-4 accent-primary cursor-pointer" />
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">{eq.nome}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">
                            {eq.tipoEquipamento} · {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                          </td>
                          <td className="px-5 py-3 w-72">
                            <select
                              value={checklistPorEquip[eq.id] ?? ''}
                              onChange={(e) => setChecklist(eq.id, e.target.value)}
                              disabled={!isIn}
                              className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white disabled:opacity-40"
                            >
                              <option value="">Sem checklist (inspeção livre)</option>
                              {checklists.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ))
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3">
        <a href={`/planos-manutencao/${id}`}
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors">
          Cancelar
        </a>
        <button type="submit" disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors">
          {isPending ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
