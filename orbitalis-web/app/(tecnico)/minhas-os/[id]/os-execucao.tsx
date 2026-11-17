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
  Camera,
  Mic,
  History,
  X,
} from 'lucide-react'
import SignatureCanvas, { type SignatureCanvasHandle } from '@/components/ui/signature-canvas'
import { atualizarStatusOs, sincronizarOs, ultimoChecklist } from './actions'
import { reduzirImagem } from '@/lib/foto'
import { saveLocalSync, loadLocalSync, clearLocalSync, hasPendingSync } from '@/lib/sync-queue'

type Resultado = 'C' | 'NC' | 'NA'

// Itens antigos só têm `marcado`: contam como Conforme
const resultadoInicial = (c: ChecklistItem): Resultado | undefined => c.resultado ?? (c.marcado ? 'C' : undefined)

type ChecklistItem = {
  id: string
  descricao: string
  obrigatorio: boolean
  marcado?: boolean
  resultado?: Resultado
}

type OsItem = {
  id: string
  equipamentoId?: string
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

export type FotoOs = { id: string; itemId: string | null; checklistItemId: string | null; momento: string; legenda: string | null }

export type OsParaExecucao = {
  id: string
  status: string
  itens: OsItem[]
  recebidoPor?: string | null
  fotos?: FotoOs[]
  dataInicio?: string | null
  dataConclusao?: string | null
}

// Entrada/saída são digitadas em horário de Brasília (AAAA-MM-DDTHH:mm)
const paraCampo = (iso?: string | null) => (iso ? new Date(Date.parse(iso) - 3 * 3600_000).toISOString().slice(0, 16) : '')
const agoraCampo = () => paraCampo(new Date().toISOString())
const paraIso = (v: string) => (v ? `${v}:00-03:00` : undefined)

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

function BotaoFoto({ rotulo, ocupado, onArquivo, destaque }: { rotulo: string; ocupado?: boolean; onArquivo: (f: File) => void; destaque?: boolean }) {
  return (
    <label className={['inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border cursor-pointer active:scale-95 transition',
      destaque ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary', ocupado ? 'opacity-60 pointer-events-none' : ''].join(' ')}>
      {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} {rotulo}
      <input type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArquivo(f) }} />
    </label>
  )
}

function Miniaturas({ fotos, onRemover }: { fotos: FotoOs[]; onRemover?: (id: string) => void }) {
  if (fotos.length === 0) return null
  const ROTULO: Record<string, string> = { antes: 'Antes', depois: 'Depois', problema: 'Problema', outra: 'Foto' }
  return (
    <div className="flex flex-wrap gap-2">
      {fotos.map((f) => (
        <div key={f.id} className="relative">
          <a href={`/api/os-foto/${f.id}`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/os-foto/${f.id}`} alt={ROTULO[f.momento] ?? 'Foto'} loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
          </a>
          <span className="absolute bottom-0 inset-x-0 text-[9px] font-semibold text-white bg-black/55 text-center rounded-b-lg py-px">{ROTULO[f.momento] ?? 'Foto'}</span>
          {onRemover && (
            <button type="button" onClick={() => onRemover(f.id)} aria-label="Remover foto"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 flex items-center justify-center shadow-sm"><X size={11} /></button>
          )}
        </div>
      ))}
    </div>
  )
}

/** Ditado por voz (reconhecimento do próprio navegador); só aparece onde houver suporte. */
function BotaoDitado({ onTexto }: { onTexto: (texto: string) => void }) {
  const [suportado, setSuportado] = useState(false)
  const [ouvindo, setOuvindo] = useState(false)
  const ref = useRef<{ stop: () => void } | null>(null)
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    setSuportado(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])
  if (!suportado) return null
  function alternar() {
    if (ouvindo) { ref.current?.stop(); return }
    const w = window as unknown as Record<string, new () => any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const R = w.SpeechRecognition || w.webkitSpeechRecognition
    const r = new R()
    r.lang = 'pt-BR'; r.interimResults = false; r.continuous = true
    r.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let t = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript
      if (t.trim()) onTexto(t.trim())
    }
    r.onend = () => setOuvindo(false)
    r.onerror = () => setOuvindo(false)
    ref.current = r
    r.start()
    setOuvindo(true)
  }
  return (
    <button type="button" onClick={alternar}
      className={['inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border', ouvindo ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'border-gray-200 text-gray-600'].join(' ')}>
      <Mic size={12} /> {ouvindo ? 'Ouvindo… toque para parar' : 'Ditar'}
    </button>
  )
}

export function OsExecucao({ os }: { os: OsParaExecucao }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)
  const sigRef = useRef<SignatureCanvasHandle>(null)
  const [entrada, setEntrada] = useState(() => paraCampo(os.dataInicio))
  const [saida, setSaida] = useState(() => paraCampo(os.dataConclusao))
  const [confirmando, setConfirmando] = useState(false)
  const [fotos, setFotos] = useState<FotoOs[]>(os.fotos ?? [])
  const [enviandoFoto, setEnviandoFoto] = useState<string[]>([])
  const [recebidoPor, setRecebidoPor] = useState(os.recebidoPor ?? '')
  const [aviso, setAviso] = useState<string | null>(null)
  const [base, setBase] = useState<string | null>(null)
  // Ao iniciar, a O.S. é recarregada com a entrada gravada pelo servidor
  useEffect(() => {
    if (!os.dataInicio || entrada) return
    const novo = paraCampo(os.dataInicio)
    const limpo = base === JSON.stringify({ checked, obs, itemStatus, entrada, saida, recebidoPor })
    setEntrada(novo)
    if (limpo) setBase(JSON.stringify({ checked, obs, itemStatus, entrada: novo, saida, recebidoPor }))
  }, [os.dataInicio])  // eslint-disable-line react-hooks/exhaustive-deps

  // Resultado de cada item do checklist: Conforme, Não conforme ou Não se aplica (ausente = ainda não respondido)
  const [checked, setChecked] = useState<Record<string, Record<string, Resultado>>>(() => {
    const init: Record<string, Record<string, Resultado>> = {}
    for (const item of os.itens) {
      const m: Record<string, Resultado> = {}
      for (const c of parseSnapshot(item.checklistSnapshot)) {
        const r = resultadoInicial(c)
        if (r) m[c.id] = r
      }
      init[item.id] = m
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
    const origem = checked[item.id] ?? {}
    setSaved(false)
    setChecked((prev) => {
      const n = { ...prev }
      for (const o of itens) {
        if (o.id !== item.id && itemStatus[o.id] !== 'concluido' && assinatura(o) === sig) n[o.id] = { ...origem }
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
      } catch (e) {
        // Sem rede: tenta de novo quando voltar. Recusa do servidor (O.S. concluída/cancelada...): avisa e descarta a fila
        const msg = e instanceof Error ? e.message : ''
        if (navigator.onLine && /conclu[ií]d|cancelad|n[ãa]o encontrada|n[ãa]o pertence/i.test(msg)) {
          clearLocalSync(os.id)
          setPendingSync(false)
          setError(`O que foi salvo sem internet não pôde ser enviado: ${msg}`)
        }
      }
    }

    trySync()
    window.addEventListener('online', trySync)
    return () => window.removeEventListener('online', trySync)
  }, [os.id])

  // Toca no mesmo resultado de novo para limpar a resposta
  function definirResultado(itemId: string, clId: string, r: Resultado) {
    setSaved(false)
    setChecked((prev) => {
      const m = { ...(prev[itemId] ?? {}) }
      if (m[clId] === r) delete m[clId]
      else m[clId] = r
      return { ...prev, [itemId]: m }
    })
  }

  const todosConformes = (item: OsItem): Record<string, Resultado> =>
    Object.fromEntries(parseSnapshot(item.checklistSnapshot).map((c) => [c.id, 'C' as Resultado]))

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

  // Marca (ou desmarca) todo o checklist de um equipamento de uma vez
  function marcarTudo(item: OsItem, marcar: boolean) {
    setSaved(false)
    setChecked((prev) => ({ ...prev, [item.id]: marcar ? todosConformes(item) : {} }))
  }

  // Marca o checklist de todos os equipamentos ainda não concluídos (visita com muitos equipamentos iguais)
  function marcarTudoGeral() {
    setSaved(false)
    setChecked((prev) => {
      const n = { ...prev }
      for (const i of os.itens) {
        if (itemStatus[i.id] !== 'concluido') n[i.id] = todosConformes(i)
      }
      return n
    })
  }

  function mandatoryOk(item: OsItem): boolean {
    const cl = parseSnapshot(item.checklistSnapshot)
    const res = checked[item.id] ?? {}
    return cl.filter((c) => c.obrigatorio).every((c) => !!res[c.id])
  }

  const feitos = os.itens.filter((i) => itemStatus[i.id] === 'concluido').length
  const prontosParaConcluir = os.itens.filter((i) => itemStatus[i.id] !== 'concluido' && mandatoryOk(i)).length
  const allItemsDone = os.itens.length > 0 && os.itens.every((i) => itemStatus[i.id] === 'concluido')

  function buildPayload(concluindo: boolean) {
    return {
      itens: os.itens.map((item) => {
        const cl = parseSnapshot(item.checklistSnapshot)
        const res = checked[item.id] ?? {}
        return {
          itemId: item.id,
          statusItem: (concluindo ? 'concluido' : (itemStatus[item.id] ?? 'pendente')) as 'pendente' | 'concluido',
          observacoesTecnicas: obs[item.id] || undefined,
          checklist: cl.map((c) => ({ ...c, resultado: res[c.id] ?? null, marcado: res[c.id] === 'C' })),
        }
      }),
      assinaturaBase64: sigRef.current?.toDataURL() ?? undefined,
      recebidoPor: recebidoPor.trim() || undefined,
      entrada: paraIso(entrada),
      saida: concluindo ? paraIso(saida || agoraCampo()) : undefined,
    }
  }

  async function enviarFoto(file: File, ctx: { itemId: string; checklistItemId?: string; momento: string }) {
    if (!navigator.onLine) { setError('Sem internet: as fotos só podem ser enviadas com conexão. Tente de novo quando voltar o sinal.'); return }
    const chave = `${ctx.itemId}:${ctx.checklistItemId ?? ctx.momento}`
    setEnviandoFoto((l) => [...l, chave])
    setError(null)
    try {
      const dados = await reduzirImagem(file)
      const r = await fetch(`/api/os-fotos/${os.id}`, { method: 'POST', body: JSON.stringify({ ...ctx, dados }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(Array.isArray(j.message) ? j.message[0] : j.message ?? 'Não foi possível enviar a foto')
      setFotos((f) => [...f, j as FotoOs])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a foto')
    } finally {
      setEnviandoFoto((l) => { const i = l.indexOf(chave); return i < 0 ? l : [...l.slice(0, i), ...l.slice(i + 1)] })
    }
  }

  async function removerFoto(id: string) {
    if (!window.confirm('Remover esta foto?')) return
    const r = await fetch(`/api/os-foto/${id}`, { method: 'DELETE' })
    if (r.ok) setFotos((f) => f.filter((x) => x.id !== id))
    else setError('Não foi possível remover a foto')
  }

  /** Repete as respostas da última visita concluída deste equipamento (só onde o item for o mesmo). */
  async function usarUltimaVisita(item: OsItem) {
    if (!item.equipamentoId) return
    setAviso(null)
    const ult = await ultimoChecklist(item.equipamentoId)
    if (!ult) { setAviso(`${item.equipamento.nome}: não há visita anterior concluída.`); return }
    const norm = (t: string) => t.trim().toLowerCase()
    const anteriores = new Map(ult.checklist.map((c) => [norm(c.descricao), (c.resultado ?? (c.marcado ? 'C' : null)) as Resultado | null]))
    const novos: Record<string, Resultado> = { ...(checked[item.id] ?? {}) }
    let n = 0
    for (const c of parseSnapshot(item.checklistSnapshot)) {
      const r = anteriores.get(norm(c.descricao))
      if (r) { novos[c.id] = r; n++ }
    }
    setChecked((prev) => ({ ...prev, [item.id]: novos }))
    setSaved(false)
    const dt = ult.data ? new Date(ult.data).toLocaleDateString('pt-BR') : ''
    setAviso(n > 0 ? `${item.equipamento.nome}: ${n} item(ns) copiados da visita ${ult.osNumero}${dt ? ` de ${dt}` : ''}. Confira antes de concluir.` : `${item.equipamento.nome}: a visita anterior tinha outro checklist.`)
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
      setBase(estado)
      setSaved(true)
      setPendingSync(true)
      return
    }

    startTransition(async () => {
      try {
        await sincronizarOs(os.id, payload)
        setSaved(true)
        setBase(estado)
        clearLocalSync(os.id)
        setPendingSync(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar progresso')
      }
    })
  }

  // Alterações ainda não salvas (compara com o último estado salvo)
  const estado = JSON.stringify({ checked, obs, itemStatus, entrada, saida, recebidoPor })
  useEffect(() => { setBase((b) => b ?? estado) }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  const naoSalvo = base !== null && base !== estado

  // Regras para encerrar a O.S. (usadas ao pedir e ao confirmar a conclusão)
  function conclusaoPermitida(): boolean {
    if (!allItemsDone) {
      setError('Marque todos os equipamentos como concluídos antes de encerrar a O.S.')
      return false
    }
    if (entrada && (saida || agoraCampo()) < entrada) {
      setError('A saída não pode ser anterior à entrada.')
      return false
    }
    setError(null)
    return true
  }

  function pedirConclusao() {
    if (conclusaoPermitida()) setConfirmando(true)
  }

  function handleConcluir() {
    if (!conclusaoPermitida()) return
    if (!navigator.onLine) {
      // Não dá para encerrar sem internet: guarda o que foi preenchido para enviar depois
      saveLocalSync(os.id, buildPayload(false))
      setBase(estado)
      setPendingSync(true)
      setConfirmando(false)
      setError('Sem internet: o que você preencheu ficou guardado neste aparelho. Quando o sinal voltar, toque em "Concluir" de novo para encerrar a O.S.')
      return
    }
    startTransition(async () => {
      try {
        await sincronizarOs(os.id, buildPayload(true))
        clearLocalSync(os.id) // descarta qualquer salvamento antigo feito sem internet
        setBase(estado)
        router.push('/minhas-os')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao concluir O.S.')
      }
    })
  }

  const isReadOnly = os.status === 'concluida' || os.status === 'cancelada'
  const canStart = os.status === 'aberta' || os.status === 'agendada'
  const isWorking = os.status === 'em_andamento'

  // Aviso ao sair: fechar a aba/recarregar e tocar em qualquer link (voltar, Agenda, menu) com a O.S. em andamento
  const pendenciasSaida = isWorking && (naoSalvo || !allItemsDone)
  useEffect(() => {
    if (!pendenciasSaida) return
    function antes(e: BeforeUnloadEvent) { if (naoSalvo) { e.preventDefault(); e.returnValue = '' } }
    function clique(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.href.startsWith('tel:') || a.href.startsWith('mailto:') || !a.href.startsWith(location.origin)) return
      if (a.pathname === location.pathname) return
      const msg = naoSalvo
        ? 'Você tem alterações NÃO SALVAS nesta O.S. Se sair agora, elas serão perdidas.\n\nSair mesmo assim?'
        : 'Esta O.S. ainda NÃO foi concluída.\n\nSair mesmo assim? (o que já foi salvo continua)'
      if (!window.confirm(msg)) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', antes)
    document.addEventListener('click', clique, true)
    return () => { window.removeEventListener('beforeunload', antes); document.removeEventListener('click', clique, true) }
  }, [pendenciasSaida, naoSalvo])

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
              {isWorking && (
                <button type="button" onClick={() => { if (confirm('Marcar o checklist de TODOS os equipamentos ainda não concluídos?')) marcarTudoGeral() }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                  Marcar tudo em todos
                </button>
              )}
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

      {/* Entrada e saída no cliente */}
      {(isWorking || isReadOnly) && (
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Clock size={12} /> Entrada e saída</p>
          <div className="grid grid-cols-2 gap-3">
            {([['Entrada', entrada, setEntrada], ['Saída', saida, setSaida]] as const).map(([rotulo, valor, set]) => (
              <div key={rotulo}>
                <label className="block text-[11px] text-gray-500 mb-1">{rotulo}</label>
                <input type="datetime-local" value={valor} disabled={isReadOnly}
                  onChange={(e) => { set(e.target.value); setSaved(false) }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {!isReadOnly && (
                  <button type="button" onClick={() => { set(agoraCampo()); setSaved(false) }}
                    className="mt-1 text-xs font-semibold text-primary">Agora</button>
                )}
              </div>
            ))}
          </div>
          {!isReadOnly && <p className="text-[11px] text-gray-400 mt-2">A entrada é gravada ao iniciar. A saída fica no horário do envio se você não informar.</p>}
        </div>
      )}

      {/* Equipamentos */}
      {os.itens.length === 0 && (
        <p className="text-sm text-center text-gray-400 py-6">Nenhum equipamento nesta O.S.</p>
      )}

      {itens.map((item, idx) => {
        if (filtro === 'pendentes' && itemStatus[item.id] === 'concluido') return null
        const cl = parseSnapshot(item.checklistSnapshot)
        const res = checked[item.id] ?? {}
        const respondidos = cl.filter((c) => res[c.id]).length
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
                <span className="text-[11px] text-gray-400 shrink-0">{cl.length > 0 ? `${respondidos}/${cl.length}` : ''}</span>
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

            {!isReadOnly && !isDone && !canMarkDone && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Faltam {cl.filter((c) => c.obrigatorio && !res[c.id]).length} item(ns) obrigatório(s) (*) para concluir este equipamento.
              </p>
            )}

            {/* Checklist */}
            {cl.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Checklist <span className="normal-case font-medium">· {respondidos}/{cl.length}</span>
                  </p>
                  {!isReadOnly && (
                    <button type="button" onClick={() => marcarTudo(item, respondidos < cl.length)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/5">
                      <CheckCheck size={12} /> {respondidos < cl.length ? 'Tudo conforme' : 'Limpar tudo'}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {cl.map((ci) => (
                    <div key={ci.id} className="flex items-center gap-3 py-2">
                      <span className="flex-1 min-w-0 text-sm text-gray-700 leading-snug">
                        {ci.descricao}
                        {ci.obrigatorio && <span className="text-destructive ml-1 text-[10px]">*</span>}
                      </span>
                      <div className="flex gap-1 shrink-0" role="group" aria-label={ci.descricao}>
                        {([['C', 'Conforme', 'bg-green-500 border-green-500 text-white'], ['NC', 'Não conforme', 'bg-red-500 border-red-500 text-white'], ['NA', 'Não se aplica', 'bg-gray-500 border-gray-500 text-white']] as const).map(([r, nome, ativo]) => (
                          <button
                            key={r}
                            type="button"
                            title={nome}
                            aria-label={nome}
                            aria-pressed={res[ci.id] === r}
                            disabled={isReadOnly}
                            onClick={() => definirResultado(item.id, ci.id, r)}
                            className={[
                              'w-10 h-9 rounded-lg border text-xs font-bold transition-colors disabled:cursor-default',
                              res[ci.id] === r ? ativo : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400',
                            ].join(' ')}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos do equipamento */}
            {(() => {
              const fotosItem = fotos.filter((f) => f.itemId === item.id && !f.checklistItemId)
              const problemas = fotos.filter((f) => f.itemId === item.id && f.checklistItemId)
              if (isReadOnly && fotosItem.length === 0 && problemas.length === 0) return null
              return (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Fotos</p>
                  {!isReadOnly && (
                    <div className="flex flex-wrap gap-2">
                      {([['antes', 'Antes'], ['depois', 'Depois'], ['outra', 'Outra']] as const).map(([m, r]) => (
                        <BotaoFoto key={m} rotulo={r} ocupado={enviandoFoto.includes(`${item.id}:${m}`)} onArquivo={(f) => enviarFoto(f, { itemId: item.id, momento: m })} />
                      ))}
                    </div>
                  )}
                  <Miniaturas fotos={[...fotosItem, ...problemas]} onRemover={isReadOnly ? undefined : removerFoto} />
                  {!isReadOnly && cl.some((c) => res[c.id] === 'NC') && (
                    <div className="space-y-1.5 rounded-xl bg-red-50 border border-red-100 p-3">
                      <p className="text-[11px] font-semibold text-red-700">Itens não conformes: registre uma foto do problema</p>
                      {cl.filter((c) => res[c.id] === 'NC').map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 min-w-0 flex-1">{c.descricao}</span>
                          <span className="shrink-0 flex items-center gap-1.5">
                            {fotos.some((f) => f.itemId === item.id && f.checklistItemId === c.id) && <span className="text-[10px] text-green-700 font-semibold">✓ {fotos.filter((f) => f.itemId === item.id && f.checklistItemId === c.id).length}</span>}
                            <BotaoFoto destaque rotulo="Foto" ocupado={enviandoFoto.includes(`${item.id}:${c.id}`)} onArquivo={(f) => enviarFoto(f, { itemId: item.id, checklistItemId: c.id, momento: 'problema' })} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Observações */}
            {!isReadOnly ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Observações técnicas</p>
                  <BotaoDitado onTexto={(t) => setObs((prev) => ({ ...prev, [item.id]: `${prev[item.id] ? prev[item.id] + ' ' : ''}${t}` }))} />
                </div>
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
              {!isReadOnly && cl.length > 0 && item.equipamentoId && (
                <button type="button" onClick={() => usarUltimaVisita(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                  <History size={12} /> Igual à última visita
                </button>
              )}
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
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Nome de quem recebeu o serviço</label>
            <input value={recebidoPor} onChange={(e) => { setRecebidoPor(e.target.value); setSaved(false) }} maxLength={120} placeholder="Ex.: Maria (recepção)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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

      {aviso && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
          <History size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1">{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar"><X size={13} /></button>
        </div>
      )}

      {/* Sync pendente */}
      {pendingSync && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <Clock size={14} className="shrink-0" />
          Progresso salvo localmente — será sincronizado ao reconectar
        </div>
      )}

      {/* Erro (fora da O.S. em andamento) */}
      {error && !isWorking && !canStart && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Barra de ação fixa: um único passo claro por vez */}
      {canStart && (
        <div className="sticky bottom-[4.5rem] z-30 -mx-1 px-1">
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-2 shadow-sm">{error}</p>}
          <button onClick={handleIniciar} disabled={isPending}
            className="w-full h-14 rounded-2xl bg-action text-white font-semibold shadow-lg flex flex-col items-center justify-center leading-tight disabled:opacity-60">
            <span className="flex items-center gap-2 text-base">{isPending ? <Loader2 size={17} className="animate-spin" /> : <PlayCircle size={17} />} Cheguei · Iniciar atendimento</span>
            <span className="text-[10px] font-normal opacity-90">Registra a hora de chegada</span>
          </button>
        </div>
      )}

      {isWorking && (() => {
        const faltam = os.itens.length - feitos
        const primeiroPendente = itens.find((i) => itemStatus[i.id] !== 'concluido')
        let acao: { rotulo: string; sub?: string; fazer: () => void; tom: 'verde' | 'azul' }
        if (allItemsDone) acao = { rotulo: 'Concluir O.S.', sub: 'Revisar e finalizar', fazer: pedirConclusao, tom: 'verde' }
        else if (prontosParaConcluir > 0) acao = { rotulo: `Concluir ${prontosParaConcluir} pronto${prontosParaConcluir > 1 ? 's' : ''}`, sub: `${faltam} equipamento${faltam > 1 ? 's' : ''} para finalizar`, fazer: concluirProntos, tom: 'azul' }
        else acao = {
          rotulo: 'Ir para o próximo pendente', sub: `${faltam} equipamento${faltam > 1 ? 's' : ''} para finalizar`, tom: 'azul',
          fazer: () => {
            if (!primeiroPendente) return
            setFiltro('pendentes')
            setAbertos((prev) => new Set(prev).add(primeiroPendente.id))
          },
        }
        return (
          <div className="sticky bottom-[4.5rem] z-30 -mx-1 px-1">
            {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-2 shadow-sm">{error}</p>}
            <div className="bg-white/95 backdrop-blur rounded-2xl border border-border shadow-lg p-2 flex items-center gap-2">
              <button onClick={handleSalvar} disabled={isPending}
                className={['shrink-0 flex flex-col items-center justify-center w-16 h-12 rounded-xl border text-[11px] font-semibold disabled:opacity-60', naoSalvo ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500'].join(' ')}>
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {naoSalvo ? 'Salvar' : 'Salvo ✓'}
              </button>
              <button onClick={acao.fazer} disabled={isPending}
                className={['flex-1 min-w-0 h-12 rounded-xl text-white font-semibold text-sm flex flex-col items-center justify-center leading-tight disabled:opacity-50', acao.tom === 'verde' ? 'bg-green-600 hover:bg-green-700' : 'bg-action hover:opacity-90'].join(' ')}>
                <span className="flex items-center gap-1.5"><CheckCheck size={15} />{acao.rotulo}</span>
                {acao.sub && <span className="text-[10px] font-normal opacity-90">{acao.sub}</span>}
              </button>
            </div>
            {pendingSync && (
              <p className="text-[11px] text-amber-700 text-center mt-1">Salvo no aparelho; envia quando houver internet.</p>
            )}
          </div>
        )
      })()}

      {/* Confirmação final */}
      {confirmando && (() => {
        const nc = os.itens.reduce((t, i) => t + Object.values(checked[i.id] ?? {}).filter((r) => r === 'NC').length, 0)
        const ncSemFoto = os.itens.reduce((t, i) => t + Object.entries(checked[i.id] ?? {}).filter(([cid, r]) => r === 'NC' && !fotos.some((f) => f.itemId === i.id && f.checklistItemId === cid)).length, 0)
        const semAssinatura = !sigRef.current || sigRef.current.isEmpty?.() === true
        return (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={() => !isPending && setConfirmando(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 text-lg">Concluir esta O.S.?</h3>
              <ul className="text-sm text-gray-700 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" /> {os.itens.length} equipamento{os.itens.length === 1 ? '' : 's'} concluído{os.itens.length === 1 ? '' : 's'}</li>
                <li className="flex items-center gap-2"><Clock size={15} className="text-gray-400" /> Entrada {entrada ? entrada.replace('T', ' ') : 'registrada ao iniciar'} · Saída {saida ? saida.replace('T', ' ') : 'agora'}</li>
                {nc > 0 && <li className="text-red-700 font-medium">⚠ {nc} item{nc > 1 ? 's' : ''} não conforme{nc > 1 ? 's' : ''} registrado{nc > 1 ? 's' : ''}</li>}
                {ncSemFoto > 0 && <li className="text-amber-700">{ncSemFoto} item(ns) não conforme sem foto do problema. Dá para voltar e fotografar.</li>}
                {semAssinatura && <li className="text-amber-700">Sem assinatura do cliente (opcional). Role a tela para colher agora.</li>}
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setConfirmando(false)} disabled={isPending} className="h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Voltar</button>
                <button onClick={handleConcluir} disabled={isPending} className="h-12 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />} Concluir
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
