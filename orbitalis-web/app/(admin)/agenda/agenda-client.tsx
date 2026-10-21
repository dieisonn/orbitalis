'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader2, Navigation, Flag } from 'lucide-react'
import {
  type EventoAgenda, type Dia, DIAS_SEMANA, MESES, hoje, somarDias, chaveDia, chaveDoInstante, mesmoDia,
  diaDaSemana, diffDias, instante, relogio, hhmm, diaPorExtenso, DIA_MS,
} from '@/lib/agenda'
import { textoSobre } from '@/lib/cor'
import { ROTULO_FERIADO, type Feriado, type TipoFeriado } from '@/lib/feriados'
import { FeriadosModal } from './feriados-modal'
import { EventoModal, type ClienteOpcao, type TecnicoOpcao, type TipoOpcao } from './evento-modal'
import { EventoPopover, EventoMenu, type Ancora } from './evento-popover'

const ancoraDe = (el: Element): Ancora => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }
type AoAbrir = (e: EventoAgenda, a: Ancora) => void
type AoMenu = (e: EventoAgenda, x: number, y: number) => void

type Visao = 'mes' | 'semana' | 'dia'
type Marca = { nome: string; tipo: TipoFeriado | 'agenda'; semEvento: boolean }  // 'semEvento': ainda não foi lançado como evento FE

const HORA_INI = 6      // grade semanal/diária: 06:00 …
const HORA_FIM = 21     // … até 21:00
const PX_HORA = 52

function intervalo(visao: Visao, cursor: Dia): { inicio: Dia; dias: number } {
  if (visao === 'dia') return { inicio: cursor, dias: 1 }
  if (visao === 'semana') return { inicio: somarDias(cursor, -diaDaSemana(cursor)), dias: 7 }
  const primeiro: Dia = { y: cursor.y, m: cursor.m, d: 1 }
  const ini = somarDias(primeiro, -diaDaSemana(primeiro))
  const ultimo = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate()
  const semanas = Math.ceil((diaDaSemana(primeiro) + ultimo) / 7)
  return { inicio: ini, dias: semanas * 7 }
}

const estiloStatus = (e: EventoAgenda) => {
  const st = e.ordemServico?.status
  return {
    opacity: st === 'cancelada' ? 0.5 : 1,
    textDecoration: st === 'cancelada' ? 'line-through' : undefined,
  } as React.CSSProperties
}

export function AgendaClient({ tipos, clientes, tecnicos, cidade, uf }: {
  tipos: TipoOpcao[]; clientes: ClienteOpcao[]; tecnicos: TecnicoOpcao[]; cidade: string | null; uf: string | null
}) {
  const [visao, setVisao] = useState<Visao>('mes')
  const [cursor, setCursor] = useState<Dia>(hoje())
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tecnicoFiltro, setTecnicoFiltro] = useState('')
  // cartão (clique esquerdo), menu (clique direito) e formulário (novo, editar ou duplicar)
  const [pop, setPop] = useState<{ e: EventoAgenda; a: Ancora } | null>(null)
  const [feriadosAberto, setFeriadosAberto] = useState(false)
  const [menu, setMenu] = useState<{ e: EventoAgenda; x: number; y: number } | null>(null)
  const [modal, setModal] = useState<{ evento: EventoAgenda | null; modelo?: EventoAgenda | null; inicio?: string; fim?: string } | null>(null)
  const setNovo = (v: { inicio: string; fim?: string }) => { setPop(null); setMenu(null); setModal({ evento: null, ...v }) }
  const abrir: AoAbrir = (e, a) => { setMenu(null); setPop({ e, a }) }
  const abrirMenu: AoMenu = (e, x, y) => { setPop(null); setMenu({ e, x, y }) }
  const arrastando = useRef<EventoAgenda | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)

  const { inicio: diaIni, dias } = useMemo(() => intervalo(visao, cursor), [visao, cursor])

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null)
    const de = instante(diaIni.y, diaIni.m, diaIni.d)
    const fim = somarDias(diaIni, dias)
    const ate = instante(fim.y, fim.m, fim.d)
    const q = `/agenda?inicio=${encodeURIComponent(de)}&fim=${encodeURIComponent(ate)}${tecnicoFiltro ? `&tecnicoId=${tecnicoFiltro}` : ''}`
    try {
      const res = await fetch(`/api/agenda-proxy?path=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message[0] : (data?.message ?? `Erro ${res.status}`))
      setEventos(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a agenda')
    } finally {
      setCarregando(false)
    }
  }, [diaIni, dias, tecnicoFiltro])

  useEffect(() => { carregar() }, [carregar])

  const porDia = useMemo(() => {
    const mapa: Record<string, EventoAgenda[]> = {}
    for (const e of eventos) {
      // evento que atravessa dias aparece em cada dia (dia inteiro de vários dias, p. ex.)
      const a = relogio(e.inicio), fimInstante = new Date(new Date(e.fim).getTime() - 1)
      const b = relogio(fimInstante)
      const n = Math.max(0, diffDias(a, b))
      for (let i = 0; i <= n; i++) {
        const k = chaveDia(somarDias(a, i))
        ;(mapa[k] ||= []).push(e)
      }
    }
    return mapa
  }, [eventos])

  // Feriados do período vêm da API (nacionais + os da empresa), um pedido por ano visível
  const [feriados, setFeriados] = useState<Record<number, Feriado[]>>({})
  const [versaoFeriados, setVersaoFeriados] = useState(0)   // sobe quando a lista muda (cadastro/remoção)
  const pedidos = useRef<Set<string>>(new Set())
  useEffect(() => {
    const ultimo = somarDias(diaIni, dias - 1)
    for (let ano = diaIni.y; ano <= ultimo.y; ano++) {
      const chave = `${versaoFeriados}:${ano}`
      if (pedidos.current.has(chave)) continue
      pedidos.current.add(chave)
      fetch(`/api/agenda-proxy?path=${encodeURIComponent(`/feriados?ano=${ano}`)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((lista: Feriado[] | null) => { if (lista) setFeriados((f) => ({ ...f, [ano]: lista })) })
        .catch(() => { pedidos.current.delete(chave) })
    }
  }, [diaIni, dias, versaoFeriados])

  // Marca por dia: feriado da lista ou evento FE já lançado na agenda
  const marcas = useMemo(() => {
    const mapa: Record<string, Marca> = {}
    for (const lista of Object.values(feriados)) {
      for (const f of lista) {
        const atual = mapa[f.data]
        // vários no mesmo dia: junta os nomes; "facultativo" só vale se não houver feriado de verdade
        if (!atual) mapa[f.data] = { nome: f.nome, tipo: f.tipo, semEvento: true }
        else {
          atual.nome = `${atual.nome} · ${f.nome}`
          if (atual.tipo === 'facultativo' && f.tipo !== 'facultativo') atual.tipo = f.tipo
        }
      }
    }
    for (const e of eventos) {
      if (e.tipoServico?.sigla !== 'FE' && !/^FE\s*-\s*/i.test(e.titulo)) continue
      const k = chaveDia(relogio(e.inicio))
      mapa[k] = { nome: e.titulo.replace(/^FE\s*-\s*/i, ''), tipo: 'agenda', semEvento: false }
    }
    return mapa
  }, [feriados, eventos])

  function navegar(sentido: -1 | 1) {
    if (visao === 'mes') setCursor((c) => ({ y: c.m + sentido < 0 ? c.y - 1 : c.m + sentido > 11 ? c.y + 1 : c.y, m: (c.m + sentido + 12) % 12, d: 1 }))
    else setCursor((c) => somarDias(c, sentido * (visao === 'semana' ? 7 : 1)))
  }

  const titulo = visao === 'mes'
    ? `${MESES[cursor.m]} ${cursor.y}`
    : visao === 'semana'
      ? (() => { const f = somarDias(diaIni, 6); return `${diaIni.d} ${MESES[diaIni.m].slice(0, 3).toLowerCase()} – ${f.d} ${MESES[f.m].slice(0, 3).toLowerCase()} ${f.y}` })()
      : diaPorExtenso(cursor) + ` de ${cursor.y}`

  // Arrastar um evento para outro dia (visão mensal): mantém o horário, muda só o dia
  async function soltar(dia: Dia) {
    const ev = arrastando.current
    arrastando.current = null
    setAlvo(null)
    if (!ev) return
    const origem = relogio(ev.inicio)
    const delta = diffDias(origem, dia)
    if (delta === 0) return
    const novoIni = new Date(new Date(ev.inicio).getTime() + delta * DIA_MS).toISOString()
    const novoFim = new Date(new Date(ev.fim).getTime() + delta * DIA_MS).toISOString()
    const anterior = eventos
    setEventos((l) => l.map((x) => (x.id === ev.id ? { ...x, inicio: novoIni, fim: novoFim } : x)))
    try {
      const res = await fetch(`/api/agenda-proxy?path=${encodeURIComponent(`/agenda/${ev.id}`)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inicio: novoIni, fim: novoFim }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(Array.isArray(d?.message) ? d.message[0] : (d?.message ?? 'Não foi possível mover'))
      }
      carregar()
    } catch (e) {
      setEventos(anterior)
      setErro(e instanceof Error ? e.message : 'Não foi possível mover o evento')
    }
  }

  const hojeDia = hoje()

  function novoHoje() { const h = hoje(); setNovo({ inicio: instante(h.y, h.m, h.d, 8, 0) }) }

  // Atalhos como no Google Agenda: D dia · W semana · M mês · T hoje · ←/→ (ou J/K) navegar · C criar
  const atalho = useRef<(e: KeyboardEvent) => void>(() => {})
  atalho.current = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || modal || feriadosAberto) return
    const alvoEl = e.target as HTMLElement | null
    if (alvoEl && (alvoEl.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvoEl.tagName))) return
    const k = e.key.toLowerCase()
    if (k !== 'escape') { setPop(null); setMenu(null) }
    if (k === 'm') setVisao('mes')
    else if (k === 'w') setVisao('semana')
    else if (k === 'd') setVisao('dia')
    else if (k === 't') setCursor(hoje())
    else if (k === 'arrowleft' || k === 'j' || k === 'p') navegar(-1)
    else if (k === 'arrowright' || k === 'k' || k === 'n') navegar(1)
    else if (k === 'c') novoHoje()
    else return
    e.preventDefault()
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => atalho.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div>
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => { setCursor(hoje()) }} title="Ir para hoje (T)"
          className="px-3 py-2 border border-border text-sm font-semibold text-gray-700 rounded-lg hover:bg-surface">Hoje</button>
        <div className="flex">
          <button onClick={() => navegar(-1)} className="p-2 border border-border rounded-l-lg hover:bg-surface text-gray-600" aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button onClick={() => navegar(1)} className="p-2 border border-l-0 border-border rounded-r-lg hover:bg-surface text-gray-600" aria-label="Próximo"><ChevronRight size={16} /></button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 min-w-[10rem]">{titulo}</h2>
        {carregando && <Loader2 size={16} className="animate-spin text-gray-400" />}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select aria-label="Filtrar por técnico" value={tecnicoFiltro} onChange={(e) => setTecnicoFiltro(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm text-gray-700 bg-white">
            <option value="">Todos os técnicos</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
          </select>
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-semibold">
            {(['mes', 'semana', 'dia'] as Visao[]).map((v) => (
              <button key={v} onClick={() => setVisao(v)} title={`${v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : 'Dia'} (${v === 'mes' ? 'M' : v === 'semana' ? 'W' : 'D'})`}
                className={`px-3 py-2 ${visao === v ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-surface'}`}>
                {v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <button onClick={() => { setPop(null); setMenu(null); setFeriadosAberto(true) }} title="Feriados: lançar e cadastrar"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-sm font-semibold text-gray-700 rounded-lg bg-white hover:bg-surface">
            <Flag size={14} /> Feriados
          </button>
          <button onClick={novoHoje} title="Novo evento (C)"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo evento
          </button>
        </div>
      </div>

      {erro && <p className="mb-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

      {visao === 'mes' ? (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2 text-xs font-semibold text-gray-500 text-center uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: dias }, (_, i) => {
              const dia = somarDias(diaIni, i)
              const k = chaveDia(dia)
              const lista = porDia[k] ?? []
              const foraDoMes = dia.m !== cursor.m
              const ehHoje = mesmoDia(dia, hojeDia)
              const marca = marcas[k]
              return (
                <div key={k}
                  onClick={() => setNovo({ inicio: instante(dia.y, dia.m, dia.d, 8, 0) })}
                  onDragOver={(e) => { e.preventDefault(); setAlvo(k) }}
                  onDragLeave={() => setAlvo((a) => (a === k ? null : a))}
                  onDrop={(e) => { e.preventDefault(); soltar(dia) }}
                  className={`min-h-[104px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-surface/60 ${foraDoMes ? 'bg-surface/50' : ''} ${marca && marca.tipo !== 'facultativo' ? 'bg-gray-100' : ''} ${alvo === k ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    {marca?.semEvento ? <span title={`${ROTULO_FERIADO[marca.tipo as TipoFeriado]}: ${marca.nome}`} className="text-[10px] leading-tight font-medium text-gray-700 truncate pt-1">{marca.nome}</span> : <span />}
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${ehHoje ? 'bg-primary text-white font-bold' : foraDoMes ? 'text-gray-500' : 'text-gray-600'}`}>{dia.d}</span>
                  </div>
                  <div className="space-y-0.5">
                    {lista.slice(0, 3).map((e) => <Chip key={e.id} e={e} onAbrir={abrir} onMenu={abrirMenu} onArrastar={(ev) => { arrastando.current = ev }} />)}
                    {lista.length > 3 && (
                      <button onClick={(ev) => { ev.stopPropagation(); setCursor(dia); setVisao('dia') }}
                        className="text-[11px] text-gray-500 hover:text-primary font-medium px-1">+{lista.length - 3} mais</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <GradeHoras dias={Array.from({ length: dias }, (_, i) => somarDias(diaIni, i))} porDia={porDia} marcas={marcas}
          onAbrir={abrir} onMenu={abrirMenu} onNovo={(inicio, fim) => setNovo({ inicio, fim })} />
      )}

      <p className="hidden md:block mt-2 text-xs text-gray-500">
        {visao !== 'mes' && 'Arraste na grade para criar um evento já com o horário. '}
        Atalhos: <kbd className="font-mono">D</kbd> dia · <kbd className="font-mono">W</kbd> semana · <kbd className="font-mono">M</kbd> mês · <kbd className="font-mono">T</kbd> hoje · <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> navegar · <kbd className="font-mono">C</kbd> novo evento
      </p>

      {feriadosAberto && (
        <FeriadosModal anoInicial={cursor.y} tipos={tipos} cidade={cidade} uf={uf} onFechar={() => setFeriadosAberto(false)} onMudou={carregar}
          onFeriadosMudaram={() => { setFeriados({}); setVersaoFeriados((v) => v + 1) }} />
      )}
      {pop && (
        <EventoPopover
          key={pop.e.id}
          evento={pop.e} ancora={pop.a}
          onFechar={() => setPop(null)}
          onEditar={() => { setPop(null); setModal({ evento: pop.e }) }}
          onDuplicar={() => { setPop(null); setModal({ evento: null, modelo: pop.e }) }}
          onMudou={carregar}
        />
      )}
      {menu && (
        <EventoMenu
          evento={menu.e} x={menu.x} y={menu.y}
          onFechar={() => setMenu(null)}
          onDuplicar={() => setModal({ evento: null, modelo: menu.e })}
          onMudou={carregar}
        />
      )}
      {modal && (
        <EventoModal
          key={modal.evento?.id ?? (modal.modelo ? `dup-${modal.modelo.id}` : 'novo')}
          evento={modal.evento}
          modelo={modal.modelo}
          inicioSugerido={modal.inicio}
          fimSugerido={modal.fim}
          tipos={tipos} clientes={clientes} tecnicos={tecnicos}
          onFechar={() => setModal(null)}
          onMudou={carregar}
        />
      )}
    </div>
  )
}

function Chip({ e, onAbrir, onMenu, onArrastar }: { e: EventoAgenda; onAbrir: AoAbrir; onMenu: AoMenu; onArrastar: (e: EventoAgenda) => void }) {
  return (
    <button
      draggable
      onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; onArrastar(e) }}
      onClick={(ev) => { ev.stopPropagation(); onAbrir(e, ancoraDe(ev.currentTarget)) }}
      onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); onMenu(e, ev.clientX, ev.clientY) }}
      title={`${e.diaInteiro ? '' : hhmm(e.inicio) + ' '}${e.titulo}`}
      style={{ backgroundColor: e.corHex, color: textoSobre(e.corHex), ...estiloStatus(e) }}
      className="w-full text-left text-[11px] leading-tight text-white rounded px-1.5 py-1 truncate hover:brightness-110">
      {!e.diaInteiro && <span className="font-semibold mr-1">{hhmm(e.inicio)}</span>}
      {e.titulo}
    </button>
  )
}

// ─── Semana / Dia: grade de horas ────────────────────────────────────────────

type Posicionado = {
  e: EventoAgenda; topo: number; altura: number; coluna: number; colunas: number
  grupo?: EventoAgenda[]   // vários eventos no mesmo horário viram um bloco só
}

const MAX_COLUNAS = 3

function posicionar(lista: EventoAgenda[], dia: Dia): Posicionado[] {
  const base = instante(dia.y, dia.m, dia.d)
  const baseMs = new Date(base).getTime()
  const itens = lista
    .filter((e) => !e.diaInteiro)
    .map((e) => {
      const ini = Math.max(0, (new Date(e.inicio).getTime() - baseMs) / 60000)
      const fim = Math.min(1440, (new Date(e.fim).getTime() - baseMs) / 60000)
      return { e, ini, fim: Math.max(fim, ini + 20) }
    })
    .sort((a, b) => a.ini - b.ini || b.fim - a.fim)

  // Agrupa eventos sobrepostos em "clusters" e reparte colunas
  const out: Posicionado[] = []
  let cluster: typeof itens = []
  let fimCluster = -1
  const fechar = () => {
    const cols: number[] = []
    const alocados = cluster.map((it) => {
      let c = cols.findIndex((f) => f <= it.ini)
      if (c === -1) { c = cols.length; cols.push(it.fim) } else cols[c] = it.fim
      return { it, c }
    })
    if (cols.length > MAX_COLUNAS) {
      // Muitos eventos ao mesmo tempo: um bloco "N eventos" em vez de colunas ilegíveis
      const ini = Math.min(...cluster.map((i) => i.ini)), fim = Math.max(...cluster.map((i) => i.fim))
      out.push({
        e: cluster[0].e,
        topo: ((ini - HORA_INI * 60) / 60) * PX_HORA,
        altura: Math.max(((fim - ini) / 60) * PX_HORA, 18),
        coluna: 0, colunas: 1, grupo: cluster.map((i) => i.e),
      })
      cluster = []
      return
    }
    for (const { it, c } of alocados) {
      out.push({
        e: it.e,
        topo: ((it.ini - HORA_INI * 60) / 60) * PX_HORA,
        altura: Math.max(((it.fim - it.ini) / 60) * PX_HORA, 18),
        coluna: c, colunas: cols.length,
      })
    }
    cluster = []
  }
  for (const it of itens) {
    if (cluster.length && it.ini >= fimCluster) { fechar(); fimCluster = -1 }
    cluster.push(it)
    fimCluster = Math.max(fimCluster, it.fim)
  }
  if (cluster.length) fechar()
  return out
}

const SNAP = 15 // minutos
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

function GradeHoras({ dias, porDia, marcas, onAbrir, onMenu, onNovo }: {
  dias: Dia[]; porDia: Record<string, EventoAgenda[]>; marcas: Record<string, Marca>
  onAbrir: AoAbrir; onMenu: AoMenu; onNovo: (inicio: string, fim?: string) => void
}) {
  // Seleção por arrasto: âncora = onde apertou; ini/fim = intervalo (minutos do dia)
  const [sel, setSel] = useState<{ k: string; ini: number; fim: number } | null>(null)
  const drag = useRef<{ k: string; dia: Dia; ancora: number; y0: number; moveu: boolean } | null>(null)
  const limite = (min: number) => Math.min(HORA_FIM * 60, Math.max(HORA_INI * 60, min))
  const minutoEm = (el: HTMLElement, clientY: number) =>
    HORA_INI * 60 + ((clientY - el.getBoundingClientRect().top) / PX_HORA) * 60
  const intervaloDe = (ancora: number, atual: number) => atual >= ancora
    ? { ini: ancora, fim: limite(Math.max(Math.ceil(atual / SNAP) * SNAP, ancora + SNAP)) }
    : { ini: limite(Math.floor(atual / SNAP) * SNAP), fim: ancora + SNAP }

  const horas = Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => HORA_INI + i)
  const [lista, setLista] = useState<EventoAgenda[] | null>(null)
  const rolagem = useRef<HTMLDivElement>(null)
  const hojeDia = hoje()
  const agora = relogio(new Date())
  useEffect(() => {
    // abre mostrando o expediente (07:00 em diante); à noite, desce um pouco
    const hora = agora.hh >= 18 ? 10 : 7
    if (rolagem.current) rolagem.current.scrollTop = (hora - HORA_INI) * PX_HORA
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* cabeçalho + dia inteiro */}
      <div className="grid border-b border-border bg-surface" style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` }}>
        <div />
        {dias.map((d) => {
          const k = chaveDia(d)
          const inteiros = (porDia[k] ?? []).filter((e) => e.diaInteiro)
          const ehHoje = mesmoDia(d, hojeDia)
          const marca = marcas[k]
          return (
            <div key={k} className={`border-l border-border px-1 py-1.5 min-w-0 ${marca && marca.tipo !== 'facultativo' ? 'bg-gray-100' : ''}`}>
              <p className="text-center text-[11px] uppercase tracking-wide text-gray-500">{DIAS_SEMANA[diaDaSemana(d)]}</p>
              <p className="flex justify-center">
                <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${ehHoje ? 'bg-primary text-white font-bold' : 'text-gray-800'}`}>{d.d}</span>
              </p>
              {marca?.semEvento && (
                <p title={`${ROTULO_FERIADO[marca.tipo as TipoFeriado]}: ${marca.nome}`} className="text-[10px] leading-tight text-center font-medium text-gray-700 truncate">{marca.nome}</p>
              )}
              <div className="space-y-0.5 mt-1">
                {inteiros.map((e) => <Chip key={e.id} e={e} onAbrir={onAbrir} onMenu={onMenu} onArrastar={() => {}} />)}
              </div>
            </div>
          )
        })}
      </div>

      <div ref={rolagem} className="overflow-y-auto max-h-[70vh]">
        <div className="grid relative" style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` }}>
          <div>
            {horas.map((h) => (
              <div key={h} style={{ height: PX_HORA }} className="relative">
                <span className="absolute -top-2 right-2 text-[11px] text-gray-400 bg-white px-0.5">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          {dias.map((d) => {
            const k = chaveDia(d)
            const pos = posicionar(porDia[k] ?? [], d)
            const ehHoje = mesmoDia(d, hojeDia)
            const feriado = marcas[k] && marcas[k].tipo !== 'facultativo'
            return (
              <div key={k} className={`relative border-l border-border min-w-0 select-none ${feriado ? 'bg-gray-100/70' : ''}`} style={{ height: horas.length * PX_HORA, touchAction: 'pan-y' }}
                onPointerDown={(ev) => {
                  if (ev.button !== 0 || (ev.target as HTMLElement).closest('button')) return
                  const el = ev.currentTarget as HTMLElement
                  el.setPointerCapture(ev.pointerId)
                  const ancora = limite(Math.floor(minutoEm(el, ev.clientY) / SNAP) * SNAP)
                  drag.current = { k, dia: d, ancora, y0: ev.clientY, moveu: false }
                }}
                onPointerMove={(ev) => {
                  const g = drag.current
                  if (!g || g.k !== k) return
                  if (!g.moveu && Math.abs(ev.clientY - g.y0) < 5) return
                  g.moveu = true
                  const { ini, fim } = intervaloDe(g.ancora, minutoEm(ev.currentTarget as HTMLElement, ev.clientY))
                  setSel({ k, ini, fim })
                }}
                onPointerUp={(ev) => {
                  const g = drag.current
                  drag.current = null
                  setSel(null)
                  if (!g || g.k !== k) return
                  if (g.moveu) {
                    const { ini, fim } = intervaloDe(g.ancora, minutoEm(ev.currentTarget as HTMLElement, ev.clientY))
                    onNovo(instante(d.y, d.m, d.d, Math.floor(ini / 60), ini % 60), instante(d.y, d.m, d.d, Math.floor(fim / 60), fim % 60))
                  } else {
                    // clique simples: início na meia hora, duração padrão
                    const min = Math.floor((minutoEm(ev.currentTarget as HTMLElement, ev.clientY)) / 30) * 30
                    onNovo(instante(d.y, d.m, d.d, Math.floor(min / 60), min % 60))
                  }
                }}
                onPointerCancel={() => { drag.current = null; setSel(null) }}>
                {horas.map((h) => <div key={h} style={{ height: PX_HORA }} className="border-b border-border/70" />)}
                {sel && sel.k === k && (
                  <div className="absolute inset-x-0.5 rounded bg-primary/25 border border-primary pointer-events-none z-20 px-1.5 py-0.5 text-[11px] font-semibold text-primary overflow-hidden"
                    style={{ top: ((sel.ini - HORA_INI * 60) / 60) * PX_HORA, height: ((sel.fim - sel.ini) / 60) * PX_HORA }}>
                    {hm(sel.ini)} – {hm(sel.fim)}
                  </div>
                )}
                {ehHoje && agora.hh >= HORA_INI && agora.hh < HORA_FIM && (
                  <div className="absolute inset-x-0 border-t-2 border-red-500 pointer-events-none z-10"
                    style={{ top: ((agora.hh * 60 + agora.mm - HORA_INI * 60) / 60) * PX_HORA }} />
                )}
                {pos.map(({ e, topo, altura, coluna, colunas, grupo }) => grupo ? (
                  <button key={`g-${e.id}`}
                    onClick={(ev) => { ev.stopPropagation(); setLista(grupo) }}
                    style={{ top: topo, height: altura, left: 0, width: '100%' }}
                    className="absolute text-left text-white rounded px-2 py-1 overflow-hidden border border-white/60 bg-slate-600 hover:bg-slate-700 text-[12px] font-semibold">
                    {grupo.length} eventos · {hhmm(grupo[0].inicio)}
                    <span className="block text-[11px] font-normal opacity-90">clique para ver a lista</span>
                  </button>
                ) : (
                  <button key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onAbrir(e, ancoraDe(ev.currentTarget)) }}
                    onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); onMenu(e, ev.clientX, ev.clientY) }}
                    style={{
                      top: topo, height: altura, left: `${(coluna / colunas) * 100}%`, width: `${100 / colunas}%`,
                      backgroundColor: e.corHex, color: textoSobre(e.corHex), ...estiloStatus(e),
                    }}
                    className="absolute text-left text-white rounded px-1.5 py-1 overflow-hidden border border-white/60 hover:brightness-110 text-[11px] leading-tight">
                    <span className="font-semibold">{hhmm(e.inicio)}</span> {e.titulo}
                    {altura > 44 && e.local && (
                      <span className="block opacity-90 truncate"><Navigation size={9} className="inline -mt-0.5 mr-0.5" />{e.local}</span>
                    )}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {lista && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setLista(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-gray-900">{lista.length} eventos neste horário</h3>
              <button onClick={() => setLista(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>
            <ul className="divide-y divide-border">
              {lista.map((e) => (
                <li key={e.id}>
                  <button onClick={(ev) => { const a = ancoraDe(ev.currentTarget); setLista(null); onAbrir(e, a) }}
                    className="w-full text-left px-5 py-3 hover:bg-surface flex items-start gap-3">
                    <span className="mt-1.5 w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: e.corHex }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{e.titulo}</span>
                      <span className="block text-xs text-gray-500">
                        {hhmm(e.inicio)} – {hhmm(e.fim)}{e.tecnico ? ` · ${e.tecnico.nome}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
