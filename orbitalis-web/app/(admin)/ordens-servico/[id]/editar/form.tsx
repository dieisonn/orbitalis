'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarOs } from './actions'
import { Wrench, ShieldCheck } from 'lucide-react'
import { ClienteSelect } from '@/components/ui/cliente-select'
import { textoSobre } from '@/lib/cor'

type Tecnico = { id: string; email: string; nome: string | null }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; localizacaoInterna: string; clienteId: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

export function EditarOsForm({
  osId,
  initialValues,
  tecnicos,
  clientes,
  ambientes,
  tiposServico,
  localTravado,
}: {
  osId: string
  initialValues: {
    dataAgendamento: string
    observacoesGerais: string | null
    tecnicoId: string | null
    tipo: string
    tipoServicoId: string | null
    horaInicio: string
    horaFim: string
    clienteId: string
    ambienteId: string
  }
  tecnicos: Tecnico[]
  clientes: Cliente[]
  ambientes: Ambiente[]
  tiposServico: TipoServico[]
  localTravado: boolean
}) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState(initialValues.clienteId)
  const [ambienteId, setAmbienteId] = useState(initialValues.ambienteId)
  const [tipoServicoId, setTipoServicoId] = useState(initialValues.tipoServicoId ?? '')
  const ambientesDoCliente = ambientes.filter((a) => a.clienteId === clienteId)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'corretiva' | 'preventiva' | 'nao_se_aplica'>(
    initialValues.tipo === 'preventiva' ? 'preventiva' : initialValues.tipo === 'nao_se_aplica' ? 'nao_se_aplica' : 'corretiva',
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dataAgendamento   = fd.get('dataAgendamento')   as string
    const observacoesGerais = fd.get('observacoesGerais') as string
    const tecnicoId         = fd.get('tecnicoId')         as string
    const horaInicio        = fd.get('horaInicio')        as string
    const horaFim           = fd.get('horaFim')           as string

    // cliente/ambiente só vão quando mudaram (evita mexer nos itens à toa)
    const localMudou = clienteId !== initialValues.clienteId || ambienteId !== initialValues.ambienteId

    setError(null)
    startTransition(async () => {
      const res = await editarOs(osId, {
        dataAgendamento, observacoesGerais, tecnicoId, tipo, tipoServicoId, horaInicio, horaFim,
        ...(localMudou ? { clienteId, ambienteId } : {}),
      })
      if (!res.ok) { setError(res.error); return }
      router.push(`/ordens-servico/${osId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Cliente e ambiente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
        <ClienteSelect clientes={clientes} value={clienteId} required ariaLabel="Cliente" disabled={localTravado}
          onChange={(id) => { setClienteId(id); setAmbienteId('') }} />
        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
          Ambiente / Local <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
        </label>
        <select
          value={ambienteId}
          onChange={(e) => setAmbienteId(e.target.value)}
          disabled={localTravado || !clienteId}
          aria-label="Ambiente"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white disabled:opacity-60"
        >
          <option value="">Sem local definido (usar o cliente)</option>
          {ambientesDoCliente.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}{a.localizacaoInterna ? ` — ${a.localizacaoInterna}` : ''}</option>
          ))}
        </select>
        {localTravado && (
          <p className="text-xs text-gray-600 mt-1">
            Cliente e ambiente não podem mudar: esta O.S. já tem itens executados ou com observações. Para outro local, crie uma nova O.S.
          </p>
        )}
      </div>

      {/* Tipo de serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Serviço <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tiposServico.map((ts) => {
            const sel = tipoServicoId === ts.id
            return (
              <button key={ts.id} type="button" onClick={() => setTipoServicoId(sel ? '' : ts.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all text-left ${sel ? 'border-transparent shadow-sm' : 'border-border text-gray-600 hover:bg-surface'}`}
                style={sel ? { backgroundColor: ts.corHex, color: textoSobre(ts.corHex) } : {}}>
                <span className="shrink-0 text-xs font-bold w-7 text-center py-0.5 rounded"
                  style={{ backgroundColor: sel ? 'transparent' : ts.corHex, color: sel ? 'inherit' : textoSobre(ts.corHex), boxShadow: sel ? 'inset 0 0 0 1px currentColor' : undefined }}>
                  {ts.sigla}
                </span>
                <span className="text-xs leading-tight">{ts.nome}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Manutenção
        </label>
        <div className="grid grid-cols-3 gap-2">
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
          <button
            type="button"
            onClick={() => setTipo('nao_se_aplica')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              tipo === 'nao_se_aplica'
                ? 'bg-gray-100 border-gray-400 text-gray-800'
                : 'border-border text-gray-500 hover:bg-surface'
            }`}
          >
            Não se aplica
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

      {/* Horários */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Início</label>
          <input name="horaInicio" type="time" defaultValue={initialValues.horaInicio}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Término</label>
          <input name="horaFim" type="time" defaultValue={initialValues.horaFim}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
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
