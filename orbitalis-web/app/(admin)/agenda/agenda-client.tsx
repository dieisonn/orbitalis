'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader2, Navigation } from 'lucide-react'
import {
  type EventoAgenda, type Dia, DIAS_SEMANA, MESES, hoje, somarDias, chaveDia, chaveDoInstante, mesmoDia,
  diaDaSemana, diffDias, instante, relogio, hhmm, diaPorExtenso, DIA_MS,
} from '@/lib/agenda'
import { EventoModal, type ClienteOpcao, type TecnicoOpcao, type TipoOpcao } from './evento-modal'

type Visao = 'mes' | 'semana' | 'dia'

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

export function AgendaClient({ tipos, clientes, tecnicos }: {
  tipos: TipoOpcao[]; clientes: ClienteOpcao[]; tecnicos: TecnicoOpcao[]
}) {
  const [visao, setVisao] = useState<Visao>('mes')
  const [cursor, setCursor] = useState<Dia>(hoje())
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tecnicoFiltro, setTecnicoFiltro] = useState('')
  const [aberto, setAberto] = useState<EventoAgenda | null>(null)
  const [novo, setNovo] = useState<string | null>(null) // ISO sugerido
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

  return (
    <div>
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => { setCursor(hoje()) }}
          className="px-3 py-2 border border-border text-sm font-semibold text-gray-700 rounded-lg hover:bg-surface">Hoje</button>
        <div className="flex">
          <button onClick={() => navegar(-1)} className="p-2 border border-border rounded-l-lg hover:bg-surface text-gray-600" aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button onClick={() => navegar(1)} className="p-2 border border-l-0 border-border rounded-r-lg hover:bg-surface text-gray-600" aria-label="Próximo"><ChevronRight size={16} /></button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 min-w-[10rem]">{titulo}</h2>
        {carregando && <Loader2 size={16} className="animate-spin text-gray-400" />}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={tecnicoFiltro} onChange={(e) => setTecnicoFiltro(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm text-gray-700 bg-white">
            <option value="">Todos os técnicos</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
          </select>
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-semibold">
            {(['mes', 'semana', 'dia'] as Visao[]).map((v) => (
              <button key={v} onClick={() => setVisao(v)}
                className={`px-3 py-2 ${visao === v ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-surface'}`}>
                {v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <button onClick={() => { const h = hoje(); setNovo(instante(h.y, h.m, h.d, 8, 0)) }}
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
              return (
                <div key={k}
                  onClick={() => setNovo(instante(dia.y, dia.m, dia.d, 8, 0))}
                  onDragOver={(e) => { e.preventDefault(); setAlvo(k) }}
                  onDragLeave={() => setAlvo((a) => (a === k ? null : a))}
                  onDrop={(e) => { e.preventDefault(); soltar(dia) }}
                  className={`min-h-[104px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-surface/60 ${foraDoMes ? 'bg-surface/50' : ''} ${alvo === k ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${ehHoje ? 'bg-primary text-white font-bold' : foraDoMes ? 'text-gray-300' : 'text-gray-600'}`}>{dia.d}</span>
                  </div>
                  <div className="space-y-0.5">
                    {lista.slice(0, 3).map((e) => <Chip key={e.id} e={e} onAbrir={setAberto} onArrastar={(ev) => { arrastando.current = ev }} />)}
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
        <GradeHoras dias={Array.from({ length: dias }, (_, i) => somarDias(diaIni, i))} porDia={porDia}
          onAbrir={setAberto} onNovo={setNovo} />
      )}

      {(aberto || novo) && (
        <EventoModal
          key={aberto?.id ?? 'novo'}
          evento={aberto}
          inicioSugerido={novo ?? undefined}
          tipos={tipos} clientes={clientes} tecnicos={tecnicos}
          onFechar={() => { setAberto(null); setNovo(null) }}
          onMudou={carregar}
        />
      )}
    </div>
  )
}

function Chip({ e, onAbrir, onArrastar }: { e: EventoAgenda; onAbrir: (e: EventoAgenda) => void; onArrastar: (e: EventoAgenda) => void }) {
  return (
    <button
      draggable
      onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; onArrastar(e) }}
      onClick={(ev) => { ev.stopPropagation(); onAbrir(e) }}
      title={`${e.diaInteiro ? '' : hhmm(e.inicio) + ' '}${e.titulo}`}
      style={{ backgroundColor: e.corHex, ...estiloStatus(e) }}
      className="w-full text-left text-[11px] leading-tight text-white rounded px-1.5 py-1 truncate hover:brightness-110">
      {!e.diaInteiro && <span className="font-semibold mr-1">{hhmm(e.inicio)}</span>}
      {e.titulo}
    </button>
  )
}

// ─── Semana / Dia: grade de horas ────────────────────────────────────────────

type Posicionado = { e: EventoAgenda; topo: number; altura: number; coluna: number; colunas: number }

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

function GradeHoras({ dias, porDia, onAbrir, onNovo }: {
  dias: Dia[]; porDia: Record<string, EventoAgenda[]>
  onAbrir: (e: EventoAgenda) => void; onNovo: (iso: string) => void
}) {
  const horas = Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => HORA_INI + i)
  const hojeDia = hoje()
  const agora = relogio(new Date())
  const col = `grid-cols-[3.5rem_repeat(${dias.length},minmax(0,1fr))]`

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* cabeçalho + dia inteiro */}
      <div className={`grid ${col} border-b border-border bg-surface`} style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` }}>
        <div />
        {dias.map((d) => {
          const k = chaveDia(d)
          const inteiros = (porDia[k] ?? []).filter((e) => e.diaInteiro)
          const ehHoje = mesmoDia(d, hojeDia)
          return (
            <div key={k} className="border-l border-border px-1 py-1.5 min-w-0">
              <p className="text-center text-[11px] uppercase tracking-wide text-gray-500">{DIAS_SEMANA[diaDaSemana(d)]}</p>
              <p className="flex justify-center">
                <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${ehHoje ? 'bg-primary text-white font-bold' : 'text-gray-800'}`}>{d.d}</span>
              </p>
              <div className="space-y-0.5 mt-1">
                {inteiros.map((e) => <Chip key={e.id} e={e} onAbrir={onAbrir} onArrastar={() => {}} />)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="overflow-y-auto max-h-[70vh]">
        <div className="grid relative" style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` }}>
          <div>
            {horas.map((h) => (
              <div key={h} style={{ height: PX_HORA }} className="text-[11px] text-gray-400 text-right pr-2 -mt-2 pt-0">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {dias.map((d) => {
            const k = chaveDia(d)
            const pos = posicionar(porDia[k] ?? [], d)
            const ehHoje = mesmoDia(d, hojeDia)
            return (
              <div key={k} className="relative border-l border-border min-w-0" style={{ height: horas.length * PX_HORA }}
                onClick={(ev) => {
                  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
                  const min = Math.floor(((ev.clientY - r.top) / PX_HORA) * 2) * 30 + HORA_INI * 60
                  onNovo(instante(d.y, d.m, d.d, Math.floor(min / 60), min % 60))
                }}>
                {horas.map((h) => <div key={h} style={{ height: PX_HORA }} className="border-b border-border/70" />)}
                {ehHoje && agora.hh >= HORA_INI && agora.hh < HORA_FIM && (
                  <div className="absolute inset-x-0 border-t-2 border-red-500 pointer-events-none z-10"
                    style={{ top: ((agora.hh * 60 + agora.mm - HORA_INI * 60) / 60) * PX_HORA }} />
                )}
                {pos.map(({ e, topo, altura, coluna, colunas }) => (
                  <button key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onAbrir(e) }}
                    style={{
                      top: topo, height: altura, left: `${(coluna / colunas) * 100}%`, width: `${100 / colunas}%`,
                      backgroundColor: e.corHex, ...estiloStatus(e),
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
    </div>
  )
}
