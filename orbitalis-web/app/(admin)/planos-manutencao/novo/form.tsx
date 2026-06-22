'use client'

import { useTransition, useState, useMemo } from 'react'
import { criarPlano } from './actions'
import { Building2, Cpu } from 'lucide-react'

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
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  equipamentos: Equipamento[]
}

type Tecnico     = { id: string; email: string; nome: string | null }
type Checklist   = { id: string; nome: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

const FREQUENCIAS = [
  { label: 'Mensal (30 dias)',      value: 30 },
  { label: 'Bimestral (60 dias)',   value: 60 },
  { label: 'Trimestral (90 dias)',  value: 90 },
  { label: 'Semestral (180 dias)',  value: 180 },
  { label: 'Anual (365 dias)',      value: 365 },
]

export function NovoPlanoForm({
  ambientes,
  tecnicos,
  checklists,
  tiposServico,
}: {
  ambientes: Ambiente[]
  tecnicos: Tecnico[]
  checklists: Checklist[]
  tiposServico: TipoServico[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')
  const [tipoServicoId, setTipoServicoId] = useState('')
  // { equipamentoId: modeloChecklistId | '' }
  const [checklistPorEquip, setChecklistPorEquip] = useState<Record<string, string>>({})

  const hoje = new Date().toISOString().split('T')[0]

  const clientes = useMemo(() => {
    const map = new Map<string, NonNullable<Ambiente['cliente']>>()
    for (const a of ambientes) {
      if (a.cliente && !map.has(a.cliente.id)) map.set(a.cliente.id, a.cliente)
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.nomeFantasia ?? a.razaoSocial).localeCompare(b.nomeFantasia ?? b.razaoSocial)
    )
  }, [ambientes])

  // Ambientes do cliente selecionado que têm equipamentos
  const ambientesDoCliente = useMemo(
    () => ambientes.filter((a) => a.clienteId === clienteId && a.equipamentos.length > 0),
    [ambientes, clienteId]
  )

  const totalEquipamentos = useMemo(
    () => ambientesDoCliente.reduce((s, a) => s + a.equipamentos.length, 0),
    [ambientesDoCliente]
  )

  function handleClienteChange(id: string) {
    setClienteId(id)
    // Pre-seleciona "" (sem checklist) para todos os equipamentos do cliente
    const configs: Record<string, string> = {}
    const ambs = ambientes.filter((a) => a.clienteId === id)
    for (const a of ambs) {
      for (const eq of a.equipamentos) {
        configs[eq.id] = ''
      }
    }
    setChecklistPorEquip(configs)
  }

  function setChecklist(equipamentoId: string, checklistId: string) {
    setChecklistPorEquip((prev) => ({ ...prev, [equipamentoId]: checklistId }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const equipamentosConfig = Object.entries(checklistPorEquip).map(([equipamentoId, modeloChecklistId]) => ({
      equipamentoId,
      modeloChecklistId: modeloChecklistId || null,
    }))

    if (equipamentosConfig.length === 0) {
      setError('Selecione ao menos um equipamento.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await criarPlano({
          clienteId,
          tecnicoId: fd.get('tecnicoId') as string,
          tipoServicoId,
          frequenciaDias: Number(fd.get('frequenciaDias')),
          proximaGeracao: fd.get('proximaGeracao') as string,
          dataFim: fd.get('dataFim') as string,
          equipamentosConfig,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar plano'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* ── Seção 1: Configurações do plano ── */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Configurações do Plano</h2>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente <span className="text-destructive">*</span>
          </label>
          <select
            value={clienteId}
            onChange={(e) => handleClienteChange(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          >
            <option value="">Selecione o cliente…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeFantasia ?? c.razaoSocial}
                {c.nomeFantasia ? ` — ${c.razaoSocial}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Serviço */}
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
            <select
              name="tecnicoId"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="">A definir na triagem…</option>
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
            <select
              name="frequenciaDias"
              required
              defaultValue={30}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              {FREQUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Primeira geração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primeira Geração de O.S. <span className="text-destructive">*</span>
            </label>
            <input
              name="proximaGeracao"
              type="date"
              required
              defaultValue={hoje}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Data fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite</label>
            <input
              name="dataFim"
              type="date"
              min={hoje}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-gray-400 mt-1">Opcional. Em branco = plano contínuo.</p>
          </div>
        </div>
      </div>

      {/* ── Seção 2: Equipamentos e checklists ── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Equipamentos e Checklists</h2>
          {clienteId && (
            <span className="text-xs text-gray-400">
              {totalEquipamentos} equipamento(s) · {ambientesDoCliente.length} ambiente(s)
            </span>
          )}
        </div>

        {!clienteId ? (
          <div className="flex items-center gap-3 p-8 text-gray-400">
            <Building2 size={20} className="shrink-0" />
            <p className="text-sm">Selecione o cliente para ver os equipamentos disponíveis.</p>
          </div>
        ) : ambientesDoCliente.length === 0 ? (
          <div className="flex items-center gap-3 p-8 text-gray-400">
            <Cpu size={20} className="shrink-0" />
            <p className="text-sm">
              Este cliente não tem equipamentos cadastrados ainda.{' '}
              <a href="/ambientes/novo" className="text-primary hover:underline font-semibold">
                Cadastre um ambiente com equipamentos.
              </a>
            </p>
          </div>
        ) : (
          <div>
            {ambientesDoCliente.map((a) => (
              <div key={a.id}>
                {/* Cabeçalho do ambiente */}
                <div className="px-5 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
                  <Building2 size={13} className="text-primary/70 shrink-0" />
                  <span className="text-xs font-bold text-primary">{a.nome}</span>
                  <span className="text-xs text-gray-400">{a.localizacaoInterna}</span>
                </div>

                {/* Equipamentos do ambiente */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipamento</th>
                      <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo / Marca</th>
                      <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-72">
                        Checklist de Manutenção
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.equipamentos.map((eq) => (
                      <tr key={eq.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-900">{eq.nome}</p>
                          {eq.numeroSerie && (
                            <p className="text-xs text-gray-400 font-mono">S/N {eq.numeroSerie}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          <p>{eq.tipoEquipamento}</p>
                          <p>{[eq.marca, eq.modelo].filter(Boolean).join(' ')}</p>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={checklistPorEquip[eq.id] ?? ''}
                            onChange={(e) => setChecklist(eq.id, e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                          >
                            <option value="">Sem checklist (inspeção livre)</option>
                            {checklists.map((c) => (
                              <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3">
        <a
          href="/planos-manutencao"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending || !clienteId || totalEquipamentos === 0}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Plano Preventivo'}
        </button>
      </div>
    </form>
  )
}
