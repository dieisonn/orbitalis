'use client'

import { useTransition, useState, useRef } from 'react'
import { criarEquipamento } from './actions'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

const TIPOS = [
  'Split Hi-Wall',
  'Split Cassete',
  'Split Piso-Teto',
  'Split Dutado',
  'Chiller',
  'Fancoil',
  'VRF / VRV',
  'Janela',
  'Cortina de Ar',
  'Outro',
]

export function NovoEquipamentoForm({ ambientes, ambienteIdInicial }: { ambientes: Ambiente[]; ambienteIdInicial?: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState(() => ambientes.find((a) => a.id === ambienteIdInicial)?.cliente?.id ?? '')
  // Campos que se repetem ao cadastrar vários equipamentos seguidos no mesmo ambiente
  const [ambienteId, setAmbienteId] = useState(ambienteIdInicial ?? '')
  const [tipo, setTipo] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [potencia, setPotencia] = useState('')
  const [criados, setCriados] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const nomeRef = useRef<HTMLInputElement>(null)

  const clientes = Array.from(
    new Map(
      ambientes
        .filter((a) => a.cliente)
        .map((a) => [a.cliente!.id, a.cliente!])
    ).values()
  ).sort((a, b) => (a.nomeFantasia ?? a.razaoSocial).localeCompare(b.nomeFantasia ?? b.razaoSocial))

  const ambientesFiltrados = clienteId
    ? ambientes.filter((a) => a.cliente?.id === clienteId)
    : ambientes

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const continuar = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'continuar'
    const fd = new FormData(e.currentTarget)
    const valorRaw = fd.get('valorAquisicao') as string

    setError(null)
    startTransition(async () => {
      try {
        await criarEquipamento({
          ambienteId:         fd.get('ambienteId') as string,
          nome:               fd.get('nome') as string,
          marca:              fd.get('marca') as string,
          modelo:             fd.get('modelo') as string,
          numeroSerie:        fd.get('numeroSerie') as string,
          tipoEquipamento:    fd.get('tipoEquipamento') as string,
          potencia:           fd.get('potencia') as string,
          dataInstalacao:     fd.get('dataInstalacao') as string,
          condicao:           fd.get('condicao') as string,
          diagnosticoInicial: fd.get('diagnosticoInicial') as string,
          valorAquisicao:     valorRaw ? Number(valorRaw) : undefined,
        }, continuar)
        if (continuar) {
          setCriados((l) => [...l, fd.get('nome') as string])
          formRef.current?.reset() // mantém ambiente, tipo, marca, modelo e potência (campos controlados)
          nomeRef.current?.focus()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar equipamento'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
        <select
          value={clienteId}
          onChange={(e) => { setClienteId(e.target.value); setAmbienteId('') }}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Todos os clientes…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nomeFantasia ?? c.razaoSocial}</option>
          ))}
        </select>
      </div>

      {/* Ambiente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ambiente <span className="text-destructive">*</span>
        </label>
        <select
          name="ambienteId"
          required
          value={ambienteId}
          onChange={(e) => setAmbienteId(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Selecione o ambiente…</option>
          {ambientesFiltrados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
              {a.cliente && !clienteId ? ` — ${a.cliente.nomeFantasia ?? a.cliente.razaoSocial}` : ''}
              {a.localizacaoInterna ? ` (${a.localizacaoInterna})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Equipamento <span className="text-destructive">*</span>
        </label>
        <input
          name="nome"
          ref={nomeRef}
          required
          minLength={2}
          placeholder="Ex: AC Sala Reuniões 1"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Tipo + Potência */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo <span className="text-destructive">*</span>
          </label>
          <select
            name="tipoEquipamento"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          >
            <option value="">Selecione o tipo…</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Potência <span className="text-destructive">*</span>
          </label>
          <input
            name="potencia"
            required
            value={potencia}
            onChange={(e) => setPotencia(e.target.value)}
            placeholder="Ex: 12000 BTU/h, 3,5 kW"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Marca + Modelo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca <span className="text-destructive">*</span>
          </label>
          <input
            name="marca"
            required
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Ex: Daikin"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <input
            name="modelo"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ex: FTXS35LVMA (opcional)"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Nº Série */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
        <input
          name="numeroSerie"
          placeholder="Nº série da placa (opcional)"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
        />
      </div>

      {/* Ciclo de Vida */}
      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Ciclo de Vida &amp; Histórico
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Instalação</label>
            <input
              name="dataInstalacao"
              type="date"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condição na Chegada</label>
            <select
              name="condicao"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="">Não informado</option>
              <option value="novo">Novo</option>
              <option value="usado">Usado</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Aquisição (R$)</label>
          <input
            name="valorAquisicao"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Diagnóstico Inicial / Observações de Entrada
          </label>
          <textarea
            name="diagnosticoInicial"
            rows={3}
            placeholder="Estado do equipamento ao ser recebido, problemas já existentes, observações do técnico…"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>
      </div>

      {criados.length > 0 && (
        <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          Criado: {criados[criados.length - 1]}
          {criados.length > 1 ? ` (${criados.length} equipamentos nesta sessão)` : ''}. Ambiente, tipo, marca, modelo e potência foram mantidos; preencha o próximo.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/equipamentos"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          {criados.length > 0 ? 'Concluir' : 'Cancelar'}
        </a>
        <button
          type="submit"
          value="continuar"
          disabled={isPending}
          className="flex-1 py-2.5 border border-action text-action font-semibold rounded-lg text-sm hover:bg-action/5 disabled:opacity-60 transition-colors"
        >
          Criar e adicionar outro
        </button>
        <button
          type="submit"
          value="fim"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando…' : 'Criar Equipamento'}
        </button>
      </div>
    </form>
  )
}
