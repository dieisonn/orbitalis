'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Navigation, ExternalLink, Loader2, Pencil, Trash2, RotateCcw, User, Phone, Clock, Building2 } from 'lucide-react'
import {
  type EventoAgenda, type Dia, relogio, instante, hhmm, diaPorExtenso, hoje,
  duracaoLegivel, mapaUrl, wazeUrl, STATUS_OS_LABEL,
} from '@/lib/agenda'

export type TipoOpcao = { id: string; sigla: string; nome: string; corHex: string; duracaoMinutos: number; ativo: boolean }
export type ClienteOpcao = { id: string; razaoSocial: string; nomeFantasia: string | null; endereco: string; telefone: string | null }
export type TecnicoOpcao = { id: string; email: string; nome: string | null }

type Props = {
  evento: EventoAgenda | null          // null = novo
  inicioSugerido?: string              // ISO — usado no novo
  fimSugerido?: string                 // ISO — fim do intervalo arrastado na grade (novo)
  tipos: TipoOpcao[]
  clientes: ClienteOpcao[]
  tecnicos: TecnicoOpcao[]
  onFechar: () => void
  onMudou: () => void                  // recarrega a agenda
}

async function chamar(method: string, path: string, body?: object) {
  const res = await fetch(`/api/agenda-proxy?path=${encodeURIComponent(path)}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message
    throw new Error(msg ?? `Erro ${res.status}`)
  }
  return data
}

const nomeCliente = (c: ClienteOpcao) => c.nomeFantasia?.trim() || c.razaoSocial
const dataInput = (d: Dia) => `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`

export function EventoModal({ evento, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou }: Props) {
  const [editando, setEditando] = useState(evento === null)

  // Esc fecha, como no Google Agenda
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {editando
          ? <Formulario {...{ evento, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou }} onCancelar={evento ? () => setEditando(false) : onFechar} />
          : <Detalhe evento={evento!} onFechar={onFechar} onEditar={() => setEditando(true)} onMudou={onMudou} />}
      </div>
    </div>
  )
}

// ─── Visualização ────────────────────────────────────────────────────────────

function Detalhe({ evento: e, onFechar, onEditar, onMudou }: {
  evento: EventoAgenda; onFechar: () => void; onEditar: () => void; onMudou: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ini = relogio(e.inicio)
  const quando = e.diaInteiro
    ? `${diaPorExtenso(ini)} · dia inteiro`
    : `${diaPorExtenso(ini)} · ${hhmm(e.inicio)} – ${hhmm(e.fim)}`
  const minutos = Math.round((new Date(e.fim).getTime() - new Date(e.inicio).getTime()) / 60000)
  const ehOs = !!e.ordemServico

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

  return (
    <>
      <div className="flex items-start gap-3 p-5 pb-3">
        <span className="mt-1.5 w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: e.corHex }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 break-words">{e.titulo}</h2>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Clock size={13} /> {quando}
            {!e.diaInteiro && <span className="text-gray-400">({duracaoLegivel(minutos)})</span>}
          </p>
        </div>
        <button onClick={onFechar} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
      </div>

      <div className="px-5 pb-5 space-y-3 text-sm">
        {e.local && (
          <div className="bg-surface rounded-lg p-3">
            <p className="flex items-start gap-2 text-gray-800">
              <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
              <span className="break-words">{e.local}</span>
            </p>
            <div className="flex gap-2 mt-2.5">
              <a href={mapaUrl(e.local)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action text-white text-xs font-semibold rounded-lg hover:bg-action/90">
                <Navigation size={12} /> Abrir no mapa
              </a>
              <a href={wazeUrl(e.local)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 text-xs font-semibold rounded-lg hover:bg-white">
                Waze
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {e.tecnico && <Info icon={<User size={13} />} rotulo="Técnico" valor={e.tecnico.nome} />}
          {e.cliente && <Info icon={<Building2 size={13} />} rotulo="Cliente" valor={e.cliente.nome} />}
          {e.cliente?.telefone && <Info icon={<Phone size={13} />} rotulo="Telefone" valor={e.cliente.telefone} />}
          {e.tipoServico && <Info rotulo="Tipo" valor={`${e.tipoServico.sigla} — ${e.tipoServico.nome}`} />}
          {e.ordemServico && (
            <Info rotulo="O.S." valor={`${e.ordemServico.numero} · ${STATUS_OS_LABEL[e.ordemServico.status] ?? e.ordemServico.status}`} />
          )}
        </div>

        {e.descricao && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Descrição</p>
            <p className="whitespace-pre-wrap text-gray-700 bg-surface rounded-lg p-3 text-[13px] leading-relaxed">{e.descricao}</p>
          </div>
        )}

        {ehOs && (
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Este evento é gerado pela O.S. Alterar data, horário ou técnico aqui atualiza a O.S.
            Para tirá-lo da agenda, cancele ou exclua a O.S.
          </p>
        )}
        {erro && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={onEditar} disabled={ocupado}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 disabled:opacity-60">
            <Pencil size={14} /> Editar
          </button>
          {ehOs && (
            <a href={`/ordens-servico/${e.ordemServico!.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-gray-700 text-sm font-semibold rounded-lg hover:bg-surface">
              <ExternalLink size={14} /> Abrir O.S.
            </a>
          )}
          {ehOs && e.personalizado && (
            <button onClick={restaurar} disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-gray-600 text-sm rounded-lg hover:bg-surface">
              <RotateCcw size={14} /> Restaurar texto da O.S.
            </button>
          )}
          {!ehOs && (
            <button onClick={excluir} disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-destructive/30 text-destructive text-sm font-semibold rounded-lg hover:bg-destructive/5 ml-auto disabled:opacity-60">
              {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function Info({ icon, rotulo, valor }: { icon?: React.ReactNode; rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center gap-1">{icon}{rotulo}</p>
      <p className="font-medium text-gray-700 break-words">{valor}</p>
    </div>
  )
}

// ─── Formulário (novo / editar) ──────────────────────────────────────────────

function Formulario({ evento, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou, onCancelar }: Props & { onCancelar: () => void }) {
  const ehOs = !!evento?.ordemServico
  const h0 = hoje()
  const base = evento ? evento.inicio : (inicioSugerido ?? instante(h0.y, h0.m, h0.d, 8, 0))
  const rIni = relogio(base)
  const rFim = relogio(evento ? evento.fim : base)

  const [tipoId, setTipoId] = useState(evento?.tipoServico?.id ?? '')
  const [clienteId, setClienteId] = useState(evento?.cliente?.id ?? '')
  const [titulo, setTitulo] = useState(evento?.titulo ?? '')
  const [local, setLocal] = useState(evento?.local ?? '')
  const [descricao, setDescricao] = useState(evento?.descricao ?? '')
  const [tecnicoId, setTecnicoId] = useState(evento?.tecnico?.id ?? '')
  const [cor, setCor] = useState(evento ? evento.corHex : '#039BE5')
  const [corEscolhida, setCorEscolhida] = useState(!!evento && !ehOs)
  const [diaInteiro, setDiaInteiro] = useState(evento?.diaInteiro ?? false)
  const [data, setData] = useState(dataInput(rIni))
  const [horaIni, setHoraIni] = useState(`${String(rIni.hh).padStart(2, '0')}:${String(rIni.mm).padStart(2, '0')}`)
  const rFimSug = !evento && fimSugerido ? relogio(fimSugerido) : null
  const [horaFim, setHoraFim] = useState(
    evento ? `${String(rFim.hh).padStart(2, '0')}:${String(rFim.mm).padStart(2, '0')}`
      : rFimSug ? `${String(rFimSug.hh).padStart(2, '0')}:${String(rFimSug.mm).padStart(2, '0')}` : '',
  )
  // fim vindo do arrasto vale como "já escolhido": o tipo de serviço não o sobrescreve
  const [tocou, setTocou] = useState({ titulo: !!evento, local: !!evento, fim: !!evento || !!rFimSug })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const tipo = tipos.find((t) => t.id === tipoId)
  const cliente = clientes.find((c) => c.id === clienteId)

  function minutosDe(h: string) { const [a, b] = h.split(':').map(Number); return a * 60 + b }
  function somar(h: string, min: number) {
    const t = (minutosDe(h) + min) % 1440
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  // Preenchimento automático: tipo → duração; tipo + cliente → título; cliente → endereço.
  // Só preenche o que a pessoa ainda não mexeu.
  function aplicar(novoTipo: typeof tipo, novoCliente: typeof cliente, hIni = horaIni) {
    if (!tocou.titulo) {
      setTitulo([novoTipo?.sigla, novoCliente ? nomeCliente(novoCliente) : null].filter(Boolean).join(' - '))
    }
    if (!tocou.local && novoCliente) setLocal(novoCliente.endereco)
    if (!tocou.fim && !diaInteiro) setHoraFim(somar(hIni, novoTipo?.duracaoMinutos ?? 60))
  }

  // Sem fim preenchido (novo evento), mostra a duração padrão
  const fimEfetivo = horaFim || somar(horaIni, tipo?.duracaoMinutos ?? 60)

  async function salvar() {
    setErro(null)
    const [y, mo, d] = data.split('-').map(Number)
    if (!y) return setErro('Informe a data')
    const inicio = diaInteiro ? instante(y, mo - 1, d, 0, 0) : instante(y, mo - 1, d, ...(horaIni.split(':').map(Number) as [number, number]))
    const fim = diaInteiro
      ? instante(y, mo - 1, d + 1, 0, 0)
      : instante(y, mo - 1, d, ...(fimEfetivo.split(':').map(Number) as [number, number]))
    if (new Date(fim) <= new Date(inicio)) return setErro('O fim deve ser depois do início')

    setSalvando(true)
    try {
      if (evento) {
        await chamar('PATCH', `/agenda/${evento.id}`, {
          titulo: titulo.trim() || undefined,
          descricao: descricao.trim() || null,
          local: local.trim() || null,
          inicio, fim,
          tecnicoId: tecnicoId || null,
          ...(ehOs ? {} : { diaInteiro, tipoServicoId: tipoId || null, clienteId: clienteId || null }),
          ...(corEscolhida ? { cor } : {}),
        })
      } else {
        await chamar('POST', '/agenda', {
          titulo: titulo.trim() || undefined,
          descricao: descricao.trim() || null,
          local: local.trim() || null,
          inicio, fim, diaInteiro,
          tecnicoId: tecnicoId || null,
          tipoServicoId: tipoId || null,
          clienteId: clienteId || null,
          ...(corEscolhida ? { cor } : {}),
        })
      }
      onMudou(); onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
      setSalvando(false)
    }
  }

  const campo = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-surface disabled:text-gray-500'
  const rot = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <>
      <div className="flex items-center justify-between p-5 pb-2">
        <h2 className="text-base font-semibold text-gray-900">{evento ? 'Editar evento' : 'Novo evento'}</h2>
        <button onClick={onFechar} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
      </div>

      <div className="px-5 pb-5 space-y-3.5">
        {ehOs && (
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Evento da O.S. {evento!.ordemServico!.numero}: data, horário e técnico atualizam a O.S.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rot}>Tipo de serviço</label>
            <select value={tipoId} disabled={ehOs} className={campo}
              onChange={(e) => { const t = tipos.find((x) => x.id === e.target.value); setTipoId(e.target.value); aplicar(t, cliente) }}>
              <option value="">— nenhum —</option>
              {tipos.filter((t) => t.ativo || t.id === tipoId).map((t) => (
                <option key={t.id} value={t.id}>{t.sigla} — {t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={rot}>Cliente</label>
            <select value={clienteId} disabled={ehOs} className={campo}
              onChange={(e) => { const c = clientes.find((x) => x.id === e.target.value); setClienteId(e.target.value); aplicar(tipo, c) }}>
              <option value="">— nenhum —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{nomeCliente(c)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={rot}>Título</label>
          <input value={titulo} className={campo} placeholder="Ex.: VT - Kátia"
            onChange={(e) => { setTitulo(e.target.value); setTocou((t) => ({ ...t, titulo: true })) }} />
          {!evento && <p className="text-[11px] text-gray-400 mt-1">Em branco, usa “SIGLA - Cliente” automaticamente.</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className={rot}>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={rot}>Início</label>
            <input type="time" value={horaIni} disabled={diaInteiro} className={campo}
              onChange={(e) => { setHoraIni(e.target.value); if (!tocou.fim) setHoraFim(somar(e.target.value, tipo?.duracaoMinutos ?? 60)) }} />
          </div>
          <div>
            <label className={rot}>Fim</label>
            <input type="time" value={diaInteiro ? '' : (horaFim || fimEfetivo)} disabled={diaInteiro} className={campo}
              onChange={(e) => { setHoraFim(e.target.value); setTocou((t) => ({ ...t, fim: true })) }} />
          </div>
        </div>
        {tipo && !diaInteiro && (
          <p className="text-[11px] text-gray-400 -mt-2">
            Duração padrão de {tipo.nome}: {duracaoLegivel(tipo.duracaoMinutos)} (ajustável em Tipos de Serviço).
          </p>
        )}
        {!ehOs && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} /> Dia inteiro
          </label>
        )}

        <div>
          <label className={rot}>Local</label>
          <input value={local} className={campo} placeholder="Endereço onde o serviço será executado"
            onChange={(e) => { setLocal(e.target.value); setTocou((t) => ({ ...t, local: true })) }} />
          {local.trim() && (
            <a href={mapaUrl(local)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-action mt-1 hover:underline">
              <Navigation size={11} /> Conferir no mapa
            </a>
          )}
        </div>

        <div>
          <label className={rot}>Técnico</label>
          <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={campo}>
            <option value="">— sem técnico —</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
          </select>
        </div>

        <div>
          <label className={rot}>Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className={campo}
            placeholder="Detalhes do atendimento, observações, o que levar…" />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={corEscolhida} onChange={(e) => setCorEscolhida(e.target.checked)} />
            Cor própria
          </label>
          {corEscolhida && (
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer" />
          )}
          {!corEscolhida && <span className="text-[11px] text-gray-400">Usa a cor do tipo de serviço.</span>}
        </div>

        {erro && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onCancelar} disabled={salvando}
            className="flex-1 py-2.5 border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60">
            {salvando ? <Loader2 size={14} className="animate-spin inline" /> : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  )
}
