'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  Loader2,
  PenLine,
  RotateCcw,
  Save,
  CheckCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react'
import SignatureCanvas, { type SignatureCanvasHandle } from '@/components/ui/signature-canvas'
import { atualizarStatusOs, sincronizarOs } from './actions'
import { saveLocalSync, loadLocalSync, clearLocalSync, hasPendingSync } from '@/lib/sync-queue'

type ChecklistItem = {
  id: string
  descricao: string
  obrigatorio: boolean
  marcado?: boolean
}

type OsItem = {
  id: string
  statusItem: string
  observacoesTecnicas: string | null
  checklistSnapshot: unknown
  equipamento: {
    nome: string
    marca: string
    modelo: string | null
    tipoEquipamento: string
    numeroSerie: string | null
    ambiente?: { nome: string } | null
  }
}

export type OsParaExecucao = {
  id: string
  status: string
  itens: OsItem[]
}

function parseSnapshot(snapshot: unknown): ChecklistItem[] {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) return snapshot as ChecklistItem[]
  try {
    const parsed = JSON.parse(String(snapshot))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function OsExecucao({ os }: { os: OsParaExecucao }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)
  const sigRef = useRef<SignatureCanvasHandle>(null)

  const [checked, setChecked] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const item of os.itens) {
      const cl = parseSnapshot(item.checklistSnapshot)
      init[item.id] = new Set(cl.filter((c) => c.marcado).map((c) => c.id))
    }
    return init
  })

  const [obs, setObs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const item of os.itens) {
      init[item.id] = item.observacoesTecnicas ?? ''
    }
    return init
  })

  const [itemStatus, setItemStatus] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const item of os.itens) {
      init[item.id] = item.statusItem
    }
    return init
  })

  // Equipamentos organizados por ambiente (salas juntas); visitas grandes começam recolhidas
  const itens = [...os.itens].sort((a, b) =>
    (a.equipamento.ambiente?.nome ?? '').localeCompare(b.equipamento.ambiente?.nome ?? '', 'pt-BR', { numeric: true }) ||
    a.equipamento.nome.localeCompare(b.equipamento.nome, 'pt-BR', { numeric: true }))
  const ambientesNomes = new Set(itens.map((i) => i.equipamento.ambiente?.nome).filter(Boolean))
  const [abertos, setAbertos] = useState<Set<string>>(() => {
    if (itens.length <= 3) return new Set(itens.map((i) => i.id))
    const primeiro = itens.find((i) => i.statusItem !== 'concluido')
    return new Set(primeiro ? [primeiro.id] : [])
  })
  const [filtro, setFiltro] = useState<'todos' | 'pendentes'>('todos')

  function alternarAberto(itemId: string) {
    setAbertos((prev) => {
      const n = new Set(prev)
      if (n.has(itemId)) n.delete(itemId)
      else n.add(itemId)
      return n
    })
  }

  // Mesmo checklist = mesmos itens (ids): permite copiar o preenchimento entre equipamentos iguais
  const assinatura = (item: OsItem) => parseSnapshot(item.checklistSnapshot).map((c) => c.id).sort().join('|')

  function aplicarAosIguais(item: OsItem) {
    const sig = assinatura(item)
    const origem = checked[item.id] ?? new Set<string>()
    setSaved(false)
    setChecked((prev) => {
      const n = { ...prev }
      for (const o of itens) {
        if (o.id !== item.id && itemStatus[o.id] !== 'concluido' && assinatura(o) === sig) n[o.id] = new Set(origem)
      }
      return n
    })
  }
  const iguaisPendentes = (item: OsItem) =>
    itens.filter((o) => o.id !== item.id && itemStatus[o.id] !== 'concluido' && assinatura(o) === assinatura(item)).length

  // Auto-sync: drena fila local quando reconectar
  useEffect(() => {
    setPendingSync(hasPendingSync(os.id))

    async function trySync() {
      if (!navigator.onLine) return
      const queued = loadLocalSync(os.id)
      if (!queued) { setPendingSync(false); return }
      try {
        await sincronizarOs(os.id, queued)
        clearLocalSync(os.id)
        setPendingSync(false)
        router.refresh()
      } catch {
        // silently retry on next online event
      }
    }

    trySync()
    window.addEventListener('online', trySync)
    return () => window.removeEventListener('online', trySync)
  }, [os.id])

  function toggleChecklist(itemId: string, clId: string) {
    setSaved(false)
    setChecked((prev) => {
      const set = new Set(prev[itemId])
      if (set.has(clId)) set.delete(clId)
      else set.add(clId)
      return { ...prev, [itemId]: set }
    })
  }

  function toggleItemDone(itemId: string) {
    setSaved(false)
    const concluindo = itemStatus[itemId] !== 'concluido'
    setItemStatus((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === 'concluido' ? 'pendente' : 'concluido',
    }))
    if (concluindo && itens.length > 3) {
      // recolhe o concluído e abre o próximo pendente
      const idx = itens.findIndex((i) => i.id === itemId)
      const proximo = [...itens.slice(idx + 1), ...itens.slice(0, idx)].find((i) => i.id !== itemId && itemStatus[i.id] !== 'concluido')
      setAbertos((prev) => {
        const n = new Set(prev)
        n.delete(itemId)
        if (proximo) n.add(proximo.id)
        return n
      })
    }
  }

  function concluirProntos() {
    setSaved(false)
    setItemStatus((prev) => {
      const n = { ...prev }
      for (const i of os.itens) if (n[i.id] !== 'concluido' && mandatoryOk(i)) n[i.id] = 'concluido'
      return n
    })
  }

  function mandatoryOk(item: OsItem): boolean {
    const cl = parseSnapshot(item.checklistSnapshot)
    const checkedSet = checked[item.id] ?? new Set()
    return cl.filter((c) => c.obrigatorio).every((c) => checkedSet.has(c.id))
  }

  const feitos = os.itens.filter((i) => itemStatus[i.id] === 'concluido').length
  const prontosParaConcluir = os.itens.filter((i) => itemStatus[i.id] !== 'concluido' && mandatoryOk(i)).length
  const allItemsDone = os.itens.length > 0 && os.itens.every((i) => itemStatus[i.id] === 'concluido')

  function buildPayload(concluindo: boolean) {
    return {
      itens: os.itens.map((item) => {
        const cl = parseSnapshot(item.checklistSnapshot)
        const checkedSet = checked[item.id] ?? new Set()
        return {
          itemId: item.id,
          statusItem: (concluindo ? 'concluido' : (itemStatus[item.id] ?? 'pendente')) as 'pendente' | 'concluido',
          observacoesTecnicas: obs[item.id] || undefined,
          checklist: cl.map((c) => ({ ...c, marcado: checkedSet.has(c.id) })),
        }
      }),
      assinaturaBase64: sigRef.current?.toDataURL() ?? undefined,
    }
  }

  function handleIniciar() {
    setError(null)
    startTransition(async () => {
      try {
        await atualizarStatusOs(os.id, 'em_andamento')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao iniciar serviço')
      }
    })
  }

  function handleSalvar() {
    setError(null)
    setSaved(false)
    const payload = buildPayload(false)

    if (!navigator.onLine) {
      saveLocalSync(os.id, payload)
      setSaved(true)
      setPendingSync(true)
      return
    }

    startTransition(async () => {
      try {
        await sincronizarOs(os.id, payload)
        setSaved(true)
        clearLocalSync(os.id)
        setPendingSync(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar progresso')
      }
    })
  }

  function handleConcluir() {
    if (!allItemsDone) {
      setError('Marque todos os equipamentos como concluídos antes de encerrar a O.S.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await sincronizarOs(os.id, buildPayload(true))
        router.push('/minhas-os')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao concluir O.S.')
      }
    })
  }

  const isReadOnly = os.status === 'concluida' || os.status === 'cancelada'
  const canStart = os.status === 'aberta' || os.status === 'agendada'
  const isWorking = os.status === 'em_andamento'

  return (
    <div className="space-y-4">
      {/* Progresso da visita */}
      {os.itens.length > 1 && (
        <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-surface/95 backdrop-blur">
          <div className="bg-white rounded-2xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-800">{feitos}/{os.itens.length} equipamentos concluídos</span>
              <span className="text-xs text-gray-400">{Math.round((feitos / os.itens.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(feitos / os.itens.length) * 100}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onClick={() => setFiltro(filtro === 'todos' ? 'pendentes' : 'todos')}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                {filtro === 'todos' ? 'Ver só pendentes' : 'Ver todos'}
              </button>
              <button type="button" onClick={() => setAbertos(abertos.size ? new Set() : new Set(itens.map((i) => i.id)))}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                {abertos.size ? 'Recolher todos' : 'Expandir todos'}
              </button>
              {isWorking && prontosParaConcluir > 0 && (
                <button type="button" onClick={concluirProntos}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-500 text-white hover:bg-green-600">
                  Concluir {prontosParaConcluir} pronto{prontosParaConcluir > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner: iniciar */}
      {canStart && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm">Serviço ainda não iniciado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Toque em Iniciar para registrar o começo do atendimento.
            </p>
          </div>
          <button
            onClick={handleIniciar}
            disabled={isPending}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60 shrink-0"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <PlayCircle size={14} />
            )}
            Iniciar
          </button>
        </div>
      )}

      {/* Equipamentos */}
      {os.itens.length === 0 && (
        <p className="text-sm text-center text-gray-400 py-6">Nenhum equipamento nesta O.S.</p>
      )}

      {itens.map((item, idx) => {
        if (filtro === 'pendentes' && itemStatus[item.id] === 'concluido') return null
        const cl = parseSnapshot(item.checklistSnapshot)
        const checkedSet = checked[item.id] ?? new Set()
        const isDone = itemStatus[item.id] === 'concluido'
        const canMarkDone = mandatoryOk(item)
        const aberto = abertos.has(item.id)
        const ambNome = item.equipamento.ambiente?.nome
        const novoGrupo = ambientesNomes.size > 1 && (idx === 0 || itens[idx - 1].equipamento.ambiente?.nome !== ambNome)
        const grupoCabecalho = novoGrupo && (
          <h3 className="pt-2 text-xs font-bold uppercase tracking-wide text-primary">{ambNome ?? 'Sem ambiente'}</h3>
        )

        if (!aberto) {
          return (
            <div key={item.id} className="space-y-2">
              {grupoCabecalho}
              <button type="button" onClick={() => alternarAberto(item.id)}
                className={['w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                  isDone ? 'bg-green-50 border-green-200' : 'bg-white border-border hover:border-primary/40'].join(' ')}>
                <span className="text-[10px] text-gray-400 w-6 shrink-0">{idx + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-800 text-sm truncate">{item.equipamento.nome}</span>
                  <span className="block text-xs text-gray-500 truncate">{item.equipamento.marca}{item.equipamento.modelo ? ` ${item.equipamento.modelo}` : ''}</span>
                </span>
                <span className="text-[11px] text-gray-400 shrink-0">{cl.length > 0 ? `${checkedSet.size}/${cl.length}` : ''}</span>
                <span className={['text-[10px] font-bold px-2 py-0.5 rounded shrink-0', isDone ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'].join(' ')}>
                  {isDone ? 'Concluído' : 'Pendente'}
                </span>
                <ChevronDown size={14} className="text-gray-400 shrink-0" />
              </button>
            </div>
          )
        }

        return (
          <div key={item.id} className="space-y-2">
          {grupoCabecalho}
          <div
            className={[
              'rounded-2xl border p-4 space-y-3 transition-colors',
              isDone ? 'bg-green-50 border-green-200' : 'bg-white border-border',
            ].join(' ')}
          >
            {/* Cabeçalho do equipamento */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {idx + 1} · {item.equipamento.tipoEquipamento}
                </p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 truncate">
                  {item.equipamento.nome}
                </p>
                <p className="text-xs text-gray-500">
                  {item.equipamento.marca}
                  {item.equipamento.modelo ? ` ${item.equipamento.modelo}` : ''}
                </p>
                {item.equipamento.numeroSerie && (
                  <p className="text-[10px] font-mono text-gray-400">
                    S/N: {item.equipamento.numeroSerie}
                  </p>
                )}
              </div>

              {isReadOnly ? (
                <span
                  className={[
                    'text-[10px] font-bold px-2 py-0.5 rounded shrink-0',
                    isDone
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700',
                  ].join(' ')}
                >
                  {isDone ? 'Concluído' : 'Pendente'}
                </span>
              ) : (
                <button
                  onClick={() => toggleItemDone(item.id)}
                  disabled={!canMarkDone && !isDone}
                  title={
                    !canMarkDone && !isDone
                      ? 'Complete todos os itens obrigatórios (*) primeiro'
                      : ''
                  }
                  className={[
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors shrink-0',
                    isDone
                      ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                      : canMarkDone
                      ? 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                      : 'bg-white border-gray-100 text-gray-300 cursor-not-allowed',
                  ].join(' ')}
                >
                  {isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  {isDone ? 'Concluído' : 'Concluir'}
                </button>
              )}
            </div>

            {/* Checklist */}
            {cl.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                  Checklist
                </p>
                <div className="space-y-2">
                  {cl.map((ci) => (
                    <label
                      key={ci.id}
                      className={[
                        'flex items-center gap-3 select-none',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={checkedSet.has(ci.id)}
                        onChange={() => !isReadOnly && toggleChecklist(item.id, ci.id)}
                        disabled={isReadOnly}
                        className="w-4 h-4 rounded accent-primary shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">
                        {ci.descricao}
                        {ci.obrigatorio && (
                          <span className="text-destructive ml-1 text-[10px]">*</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {!isReadOnly ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                  Observações técnicas
                </p>
                <textarea
                  rows={2}
                  value={obs[item.id] ?? ''}
                  onChange={(e) =>
                    setObs((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Peças trocadas, medições, anomalias encontradas..."
                  className="w-full rounded-lg border border-gray-200 text-sm text-gray-700 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition"
                />
              </div>
            ) : item.observacoesTecnicas ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Observações técnicas
                </p>
                <p className="text-sm text-gray-600">{item.observacoesTecnicas}</p>
              </div>
            ) : null}

            {/* Ações do equipamento */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isReadOnly && iguaisPendentes(item) > 0 && (
                <button type="button" onClick={() => aplicarAosIguais(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                  <Copy size={12} /> Copiar para {iguaisPendentes(item)} equipamento{iguaisPendentes(item) > 1 ? 's' : ''} igual{iguaisPendentes(item) > 1 ? 'is' : ''}
                </button>
              )}
              {itens.length > 1 && (
                <button type="button" onClick={() => alternarAberto(item.id)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto">
                  <ChevronUp size={12} /> Recolher
                </button>
              )}
            </div>
          </div>
          </div>
        )
      })}

      {/* Assinatura */}
      {isWorking && (
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
              <PenLine size={12} />
              Assinatura do cliente
              <span className="font-normal normal-case text-gray-300">(opcional)</span>
            </p>
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="text-[10px] text-gray-400 hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={10} />
              Limpar
            </button>
          </div>
          <SignatureCanvas
            ref={sigRef}
            className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
          />
          <p className="text-[10px] text-gray-400 text-center">
            Peça ao cliente para assinar acima
          </p>
        </div>
      )}

      {/* Sync pendente */}
      {pendingSync && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <Clock size={14} className="shrink-0" />
          Progresso salvo localmente — será sincronizado ao reconectar
        </div>
      )}

      {/* Erro */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Botões de ação */}
      {isWorking && (
        <div className="space-y-2 pb-2">
          <button
            onClick={handleSalvar}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-primary text-primary font-semibold rounded-xl text-sm hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saved ? 'Progresso salvo ✓' : 'Salvar Progresso'}
          </button>
          <button
            onClick={handleConcluir}
            disabled={isPending || !allItemsDone}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-action text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}
            Concluir O.S.
          </button>
          {!allItemsDone && os.itens.length > 0 && (
            <p className="text-center text-[11px] text-gray-400">
              Marque todos os equipamentos como concluídos para encerrar a O.S.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
