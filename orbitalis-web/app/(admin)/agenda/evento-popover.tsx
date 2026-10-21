'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  X, MapPin, Navigation, ExternalLink, Loader2, Pencil, Trash2, RotateCcw, User, Phone, Clock,
  Building2, Copy, AlignLeft, Wrench,
} from 'lucide-react'
import {
  type EventoAgenda, relogio, hhmm, diaPorExtenso, duracaoLegivel, mapaUrl, wazeUrl, STATUS_OS_LABEL,
  corPadraoDe,
} from '@/lib/agenda'
import { textoSobre } from '@/lib/cor'
import { chamar } from './evento-modal'
import { PaletaCor } from './paleta-cor'

const MARGEM = 8

/** Posição na tela: ao lado do evento (direita, ou esquerda se faltar espaço), sempre dentro da janela. */
function useLugar(rect: { x: number; y: number; w: number; h: number } | null, largura: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const rx = rect?.x, ry = rect?.y, rw = rect?.w, rh = rect?.h
  useLayoutEffect(() => {
    if (rx === undefined || ry === undefined || rw === undefined || rh === undefined || !ref.current) return
    const rect = { x: rx, y: ry, w: rw, h: rh }
    const vw = window.innerWidth, vh = window.innerHeight
    const alt = ref.current.offsetHeight
    let left: number
    if (vw < 640) left = Math.max(MARGEM, (vw - largura) / 2)
    else if (rect.x + rect.w + MARGEM + largura <= vw - MARGEM) left = rect.x + rect.w + MARGEM
    else if (rect.x - MARGEM - largura >= MARGEM) left = rect.x - MARGEM - largura
    else left = Math.min(Math.max(MARGEM, rect.x), vw - largura - MARGEM)
    const top = Math.min(Math.max(MARGEM, rect.y), Math.max(MARGEM, vh - alt - MARGEM))
    setPos({ left, top })
  }, [rx, ry, rw, rh, largura])
  return { ref, pos }
}

/** Fecha com Esc e com clique fora. */
function useFechar(ref: React.RefObject<HTMLElement | null>, onFechar: () => void) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onFechar() }
    window.addEventListener('keydown', tecla)
    document.addEventListener('mousedown', fora)
    return () => { window.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fora) }
  }, [ref, onFechar])
}

export type Ancora = { x: number; y: number; w: number; h: number }

// ─── Clique esquerdo: cartão do evento ───────────────────────────────────────

export function EventoPopover({ evento: e, ancora, onFechar, onEditar, onDuplicar, onMudou }: {
  evento: EventoAgenda; ancora: Ancora
  onFechar: () => void; onEditar: () => void; onDuplicar: () => void; onMudou: () => void
}) {
  const LARGURA = 380
  const { ref, pos } = useLugar(ancora, LARGURA)
  useFechar(ref, onFechar)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ini = relogio(e.inicio)
  const minutos = Math.round((new Date(e.fim).getTime() - new Date(e.inicio).getTime()) / 60000)
  const quando = e.diaInteiro ? 'Dia inteiro' : `${hhmm(e.inicio)} – ${hhmm(e.fim)}`
  const ehOs = !!e.ordemServico
  const cancelada = e.ordemServico?.status === 'cancelada'

  async function executar(fn: () => Promise<unknown>) {
    setOcupado(true); setErro(null)
    try { await fn(); onMudou(); onFechar() }
    catch (err) { setErro(err instanceof Error ? err.message : 'Erro'); setOcupado(false) }
  }
  const excluir = () => {
    if (!confirm(`Excluir o evento "${e.titulo}"?`)) return
    executar(() => chamar('DELETE', `/agenda/${e.id}`))
  }
  const restaurar = () => {
    if (!confirm('Voltar título, descrição e local para o texto gerado pela O.S.?')) return
    executar(() => chamar('POST', `/agenda/${e.id}/restaurar`))
  }

  const btn = 'w-9 h-9 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50'

  return (
    <div ref={ref} role="dialog" aria-label={`Evento: ${e.titulo}`}
      style={{ position: 'fixed', zIndex: 60, width: Math.min(LARGURA, window.innerWidth - 2 * MARGEM), left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className="bg-white rounded-xl shadow-xl border border-border overflow-hidden max-h-[calc(100vh-16px)] overflow-y-auto">
      <div className="h-2" style={{ backgroundColor: e.corHex }} />

      <div className="flex items-center justify-end gap-0.5 px-2 pt-2">
        <button onClick={onEditar} disabled={ocupado} className={btn} title="Editar" aria-label="Editar evento"><Pencil size={17} /></button>
        <button onClick={onDuplicar} disabled={ocupado} className={btn} title="Duplicar" aria-label="Duplicar evento"><Copy size={17} /></button>
        {!ehOs && (
          <button onClick={excluir} disabled={ocupado} className={`${btn} hover:!bg-red-50 hover:text-red-600`} title="Excluir" aria-label="Excluir evento">
            {ocupado ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
          </button>
        )}
        <button onClick={onFechar} className={btn} title="Fechar (Esc)" aria-label="Fechar"><X size={18} /></button>
      </div>

      <div className="px-5 pb-5 pt-1">
        <div className="flex items-start gap-3">
          <span className="mt-2 w-3.5 h-3.5 rounded-[4px] shrink-0" style={{ backgroundColor: e.corHex }} />
          <div className="min-w-0">
            <h2 className={`text-[22px] leading-snug font-semibold text-gray-900 break-words ${cancelada ? 'line-through opacity-70' : ''}`}>{e.titulo}</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {diaPorExtenso(ini)} <span aria-hidden>·</span> {quando}
              {!e.diaInteiro && <span className="text-gray-500"> ({duracaoLegivel(minutos)})</span>}
            </p>
            {cancelada && <span className="inline-block mt-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded px-2 py-0.5">O.S. cancelada</span>}
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
          {e.local && (
            <Linha icone={<MapPin size={16} />}>
              <p className="break-words">{e.local}</p>
              <div className="flex gap-2 mt-1.5">
                <a href={mapaUrl(e.local)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-action text-white text-xs font-semibold rounded-full hover:bg-action/90">
                  <Navigation size={12} /> Abrir no mapa
                </a>
                <a href={wazeUrl(e.local)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 border border-border text-gray-700 text-xs font-semibold rounded-full hover:bg-surface">Waze</a>
              </div>
            </Linha>
          )}
          {e.descricao && (
            <Linha icone={<AlignLeft size={16} />}>
              <p className="whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{e.descricao}</p>
            </Linha>
          )}
          {e.tecnico && <Linha icone={<User size={16} />}><p>{e.tecnico.nome}</p></Linha>}
          {e.cliente && (
            <Linha icone={<Building2 size={16} />}>
              <p>{e.cliente.nome}</p>
              {e.cliente.telefone && (
                <p className="text-gray-600 flex items-center gap-1 mt-0.5"><Phone size={12} /> {e.cliente.telefone}</p>
              )}
            </Linha>
          )}
          {e.tipoServico && (
            <Linha icone={<Wrench size={16} />}>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] font-bold rounded px-1.5 py-0.5"
                  style={{ backgroundColor: e.tipoServico.corHex, color: textoSobre(e.tipoServico.corHex) }}>{e.tipoServico.sigla}</span>
                {e.tipoServico.nome}
              </span>
            </Linha>
          )}
          {e.ordemServico && (
            <Linha icone={<Clock size={16} />}>
              <p>O.S. {e.ordemServico.numero} · {STATUS_OS_LABEL[e.ordemServico.status] ?? e.ordemServico.status}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mudar data, horário ou técnico aqui atualiza a O.S.</p>
            </Linha>
          )}
        </div>

        {erro && <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

        {ehOs && (
          <div className="flex flex-wrap gap-2 mt-4">
            <a href={`/ordens-servico/${e.ordemServico!.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
              <ExternalLink size={14} /> Abrir O.S.
            </a>
            {e.personalizado && (
              <button onClick={restaurar} disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-gray-700 text-sm rounded-lg hover:bg-surface">
                <RotateCcw size={14} /> Restaurar texto da O.S.
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Linha({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 w-4 shrink-0 text-gray-500">{icone}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// ─── Clique direito: Excluir · Duplicar · cores ──────────────────────────────

export function EventoMenu({ evento: e, x, y, onFechar, onDuplicar, onMudou }: {
  evento: EventoAgenda; x: number; y: number
  onFechar: () => void; onDuplicar: () => void; onMudou: () => void
}) {
  const LARGURA = 248
  const { ref, pos } = useLugar({ x, y, w: 0, h: 0 }, LARGURA)
  useFechar(ref, onFechar)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ehOs = !!e.ordemServico
  const padrao = corPadraoDe(e)
  const atual = e.corHex.toLowerCase() === padrao.toLowerCase() ? null : e.corHex

  async function executar(fn: () => Promise<unknown>) {
    setOcupado(true); setErro(null)
    try { await fn(); onMudou(); onFechar() }
    catch (err) { setErro(err instanceof Error ? err.message : 'Erro'); setOcupado(false) }
  }

  const item = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent text-left'

  return (
    <div ref={ref} role="dialog" aria-label="Ações do evento"
      onContextMenu={(ev) => ev.preventDefault()}
      style={{ position: 'fixed', zIndex: 70, width: LARGURA, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className="bg-white rounded-xl shadow-xl border border-border py-1.5">
      <button disabled={ocupado || ehOs} className={item}
        title={ehOs ? 'Evento de O.S.: cancele ou exclua a O.S. para tirá-lo da agenda' : undefined}
        onClick={() => { if (confirm(`Excluir o evento "${e.titulo}"?`)) executar(() => chamar('DELETE', `/agenda/${e.id}`)) }}>
        {ocupado ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} className="text-gray-600" />} Excluir
      </button>
      <button disabled={ocupado} className={item} onClick={() => { onFechar(); onDuplicar() }}>
        <Copy size={17} className="text-gray-600" /> Duplicar
      </button>
      <div className="border-t border-border my-1.5" />
      <div className="px-4 pt-1 pb-2">
        <PaletaCor atual={atual} padrao={padrao}
          onEscolher={(hex) => executar(() => chamar('PATCH', `/agenda/${e.id}`, { cor: hex }))} />
      </div>
      {erro && <p className="mx-3 mb-2 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">{erro}</p>}
    </div>
  )
}
