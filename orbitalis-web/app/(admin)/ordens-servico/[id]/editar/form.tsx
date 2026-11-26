'use client'
import { HorarioOs, type DiaOs } from '@/components/ui/horario-os'
import { SeletorEnderecoOs, type EnderecoCliente } from '@/components/ui/seletor-endereco-os'

import { SeletorTiposServico } from '@/components/ui/seletor-tipos-servico'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarOs } from './actions'
import { AjudantesSelect } from '@/components/ui/ajudantes-select'
import { NENHUM_CHECKLIST } from '@/components/ui/checklist-select'
import { TIPO_OS_LABEL, type ModeloResumo } from '@/lib/checklist'
import { Wrench, ShieldCheck } from 'lucide-react'
import { ClienteSelect } from '@/components/ui/cliente-select'
import { textoSobre } from '@/lib/cor'
import { SeletorEquipamentos, type EquipamentoOpcao } from '@/components/ui/seletor-equipamentos'

type Tecnico = { id: string; email: string; nome: string | null }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null; endereco?: string; enderecosExtras?: EnderecoCliente[] }
type Ambiente = { id: string; nome: string; localizacaoInterna: string; clienteId: string; equipamentos?: EquipamentoOpcao[] }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }

export function EditarOsForm({
  osId,
  initialValues,
  tecnicos,
  clientes,
  ambientes,
  tiposServico,
  localTravado,
  modelos,
  temEquipamentos,
  checklistAtualItens,
  equipamentosAtuaisIds,
  equipamentosEmUsoIds,
}: {
  osId: string
  initialValues: {
    dataAgendamento: string
    observacoesGerais: string | null
    tecnicoId: string | null
    tipo: string
    tipoServicoId: string | null
    tiposServicoExtras: string[]
    enderecoId: string | null
    dias: DiaOs[]
    horaInicio: string
    horaFim: string
    clienteId: string
    ambienteId: string
    auxiliaresIds: string[]
  }
  tecnicos: Tecnico[]
  clientes: Cliente[]
  ambientes: Ambiente[]
  tiposServico: TipoServico[]
  localTravado: boolean
  modelos: ModeloResumo[]
  temEquipamentos: boolean
  checklistAtualItens: number
  equipamentosAtuaisIds: string[]
  equipamentosEmUsoIds: string[]
}) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState(initialValues.clienteId)
  const [enderecoId, setEnderecoId] = useState(initialValues.enderecoId ?? '')
  const [tiposIds, setTiposIds] = useState<string[]>(
    [initialValues.tipoServicoId, ...initialValues.tiposServicoExtras].filter((x): x is string => !!x),
  )
  const tipoServicoId = tiposIds[0] ?? ''
  const ambientesDoCliente = ambientes.filter((a) => a.clienteId === clienteId)

  // Equipamentos da O.S.: começa com os atuais; ao trocar de ambiente passa a valer o do novo (todos marcados)
  // todos os equipamentos do cliente (de qualquer ambiente), agrupados pelo nome do ambiente
  const equipsCliente: EquipamentoOpcao[] = ambientesDoCliente.flatMap((a) => (a.equipamentos ?? []).map((e) => ({ ...e, grupo: a.nome })))
  const [selEquips, setSelEquips] = useState<string[]>(equipamentosAtuaisIds)
  // O ambiente da O.S. acompanha os equipamentos marcados: continua o atual enquanto algum equipamento dele estiver marcado
  // (ou sem seleção); senão passa a ser o do primeiro marcado. Com itens já executados o local não muda.
  const trocouCliente = clienteId !== initialValues.clienteId
  const ambienteEfetivo = trocouCliente
    ? (ambientesDoCliente.find((a) => (a.equipamentos ?? []).some((e) => selEquips.includes(e.id)))?.id ?? '')
    : localTravado || selEquips.length === 0 || ambientesDoCliente.find((a) => a.id === initialValues.ambienteId)?.equipamentos?.some((e) => selEquips.includes(e.id))
      ? initialValues.ambienteId
      : (ambientesDoCliente.find((a) => (a.equipamentos ?? []).some((e) => selEquips.includes(e.id)))?.id ?? initialValues.ambienteId)
  const ambienteMudou = ambienteEfetivo !== initialValues.ambienteId
  const mudouSelecao = selEquips.length !== equipamentosAtuaisIds.length || selEquips.some((x) => !equipamentosAtuaisIds.includes(x))

  const [tecnicoId, setTecnicoId] = useState(initialValues.tecnicoId ?? '')
  const [ajudantes, setAjudantes] = useState<string[]>(initialValues.auxiliaresIds)
  const [checklistId, setChecklistId] = useState('') // '' = manter o atual
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
    const horaInicio        = fd.get('horaInicio')        as string
    const horaFim           = fd.get('horaFim')           as string
    const diasJson          = fd.get('diasJson')          as string
    const dias: DiaOs[] = diasJson ? JSON.parse(diasJson) : []

    // cliente/ambiente só vão quando mudaram (evita mexer nos itens à toa)
    const localMudou = clienteId !== initialValues.clienteId || ambienteEfetivo !== initialValues.ambienteId

    setError(null)
    startTransition(async () => {
      const res = await editarOs(osId, {
        dataAgendamento, observacoesGerais, tecnicoId, auxiliaresIds: ajudantes.filter((a) => a !== tecnicoId), tipo, tipoServicoId, tiposServicoExtras: tiposIds.slice(1), enderecoId, dias, horaInicio, horaFim,
        ...(localMudou ? { clienteId, ambienteId: ambienteEfetivo } : {}),
        ...(equipsCliente.length > 0 && (mudouSelecao || ambienteMudou) ? { equipamentosIds: selEquips } : {}),
        ...(checklistId === NENHUM_CHECKLIST ? { semChecklist: true } : checklistId ? { modeloChecklistId: checklistId } : {}),
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
          onChange={(id) => { setClienteId(id); setSelEquips([]); setEnderecoId('') }} />
        {localTravado && (
          <p className="text-xs text-gray-600 mt-1">
            O cliente não pode mudar: esta O.S. já tem itens executados ou com observações. Para outro cliente, crie uma nova O.S.
          </p>
        )}
      </div>

      {equipsCliente.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipamentos desta O.S. <span className="ml-1 text-xs font-normal text-gray-500">(marque um, vários ou todos)</span>
          </label>
          <SeletorEquipamentos
            equipamentos={equipsCliente}
            selecionados={selEquips}
            onChange={setSelEquips}
            travados={equipamentosEmUsoIds}
          />
          <p className="text-xs text-gray-500 mt-1">Equipamento já executado pelo técnico não pode ser retirado. Os novos entram com o checklist atual da O.S.</p>
        </div>
      )}

      {(() => { const c = clientes.find((x) => x.id === clienteId); return <SeletorEnderecoOs extras={c?.enderecosExtras ?? []} principal={c?.endereco} value={enderecoId} onChange={setEnderecoId} /> })()}

      {/* Tipo de serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Serviço <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
        </label>
        <SeletorTiposServico tipos={tiposServico} value={tiposIds} onChange={setTiposIds} />
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
          value={tecnicoId}
          onChange={(e) => setTecnicoId(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">A definir na triagem…</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>
          ))}
        </select>
      </div>

      {/* Ajudantes */}
      <AjudantesSelect tecnicos={tecnicos} responsavelId={tecnicoId} value={ajudantes} onChange={setAjudantes} />

      {/* Checklist */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Checklist</label>
        <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
          <option value="">
            {!temEquipamentos ? 'Nenhum — esta O.S. não tem equipamento' : checklistAtualItens > 0 ? `Manter o checklist atual (${checklistAtualItens} itens)` : 'Manter (esta O.S. está sem checklist)'}
          </option>
          <option value={NENHUM_CHECKLIST}>Sem checklist nesta O.S.</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}{m.tipo ? ` (${TIPO_OS_LABEL[m.tipo]})` : ''}</option>
          ))}
        </select>
        {!temEquipamentos && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
            Esta O.S. está sem equipamento, e o checklist é aplicado em cada equipamento. Para usar um checklist, escolha acima um <strong>ambiente com equipamentos cadastrados</strong> (ou cadastre o equipamento do cliente) e salve.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">Vale para os equipamentos que o técnico ainda não começou. O que já foi preenchido não é alterado.</p>
      </div>

      {/* Data e horários */}
      <HorarioOs dataInicial={initialValues.dataAgendamento} inicioInicial={initialValues.horaInicio} fimInicial={initialValues.horaFim} diasIniciais={initialValues.dias} />

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
