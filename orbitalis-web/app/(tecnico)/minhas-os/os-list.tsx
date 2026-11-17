'use client'

import { useState } from 'react'
import { StatusBadge, osAtrasada } from '@/components/ui/status-badge'
import { ClipboardList, Navigation, Phone, Search, Clock, MapPin } from 'lucide-react'
import { mapaUrl } from '@/lib/agenda'
import { numeroOs as formatarNumero } from '@/lib/os-numero'

export type OrdemServicoLista = {
  id: string
  numero?: number | null
  status: string
  tipo?: string | null
  origem: string
  dataAgendamento: string
  horaInicio?: string | null
  ambiente: { nome: string; localizacaoInterna: string; cliente?: { razaoSocial: string; nomeFantasia: string | null; telefone?: string | null; celular?: string | null } }
  tipoServico?: { sigla: string; nome: string } | null
  enderecoServico?: { rotulo: string | null; endereco: string }
  itens: { id: string }[]
  dias?: { data: string }[]
}

type Tab = 'hoje' | 'pendentes' | 'concluidas'

const FINAIS = ['concluida', 'cancelada']
const hojeBr = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

// A data da O.S. é só o dia (meia-noite UTC) e "hoje" é o dia em Brasília: compara como texto AAAA-MM-DD.
function diasDa(os: OrdemServicoLista): string[] {
  return os.dias?.length ? os.dias.map((d) => d.data.slice(0, 10)) : [os.dataAgendamento.slice(0, 10)]
}
const isHoje = (os: OrdemServicoLista) => diasDa(os).includes(hojeBr())

function diffDias(iso: string): number {
  const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  const h = hojeBr()
  const b = Date.UTC(+h.slice(0, 4), +h.slice(5, 7) - 1, +h.slice(8, 10))
  return Math.round((a - b) / 86_400_000)
}

function quando(os: OrdemServicoLista): { texto: string; tom: 'ruim' | 'hoje' | 'normal' } {
  const iso = os.dataAgendamento.slice(0, 10)
  const dia = isHoje(os) ? hojeBr() : iso
  const n = diffDias(dia)
  const hora = os.horaInicio ? ` · ${os.horaInicio}` : ''
  if (n === 0) return { texto: `Hoje${hora}`, tom: 'hoje' }
  if (n < 0) return { texto: n === -1 ? 'Ontem' : `Há ${-n} dias`, tom: 'ruim' }
  if (n === 1) return { texto: `Amanhã${hora}`, tom: 'normal' }
  const d = new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' })
  return { texto: `${d}${hora}`, tom: 'normal' }
}

const nomeCliente = (os: OrdemServicoLista) => os.ambiente.cliente?.nomeFantasia || os.ambiente.cliente?.razaoSocial || os.ambiente.nome
const numeroOs = (os: OrdemServicoLista) => formatarNumero(os)

function Cartao({ os }: { os: OrdemServicoLista }) {
  const atrasada = !FINAIS.includes(os.status) && osAtrasada(os.status, os.dataAgendamento) && !isHoje(os)
  const q = quando(os)
  const endereco = os.enderecoServico?.endereco
  const tel = os.ambiente.cliente?.celular || os.ambiente.cliente?.telefone
  const local = [os.ambiente.nome, os.ambiente.localizacaoInterna].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ')
  const aberto = !FINAIS.includes(os.status)

  return (
    <div className={['rounded-2xl border overflow-hidden', atrasada ? 'bg-red-50/60 border-red-200' : os.status === 'em_andamento' ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-border'].join(' ')}>
      <a href={`/minhas-os/${os.id}`} className="block p-4 active:bg-black/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight">{nomeCliente(os)}</p>
            {endereco && (
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5" /><span className="line-clamp-2">{endereco}</span></p>
            )}
            {local && local !== nomeCliente(os) && <p className="text-xs text-gray-400 mt-0.5 truncate">{local}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={['text-xs font-semibold flex items-center justify-end gap-1', q.tom === 'ruim' ? 'text-red-600' : q.tom === 'hoje' ? 'text-primary' : 'text-gray-600'].join(' ')}>
              <Clock size={11} />{q.texto}
            </p>
            {os.itens.length > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{os.itens.length} equip.</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="text-[11px] font-mono text-gray-400">{numeroOs(os)}</span>
          <StatusBadge status={os.status as 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'} />
          {os.tipoServico && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{os.tipoServico.nome}</span>}
          {os.tipo === 'preventiva' && !os.tipoServico && <span className="text-[11px] text-gray-500">Preventiva</span>}
        </div>
      </a>
      {aberto && (endereco || tel) && (
        <div className="flex border-t border-black/5 text-xs font-semibold">
          {endereco && (
            <a href={mapaUrl(endereco)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-action active:bg-black/5">
              <Navigation size={14} /> Rota
            </a>
          )}
          {tel && (
            <a href={`tel:${tel}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-700 border-l border-black/5 active:bg-black/5">
              <Phone size={14} /> Ligar
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function Grupo({ titulo, tom, lista }: { titulo: string; tom?: 'ruim'; lista: OrdemServicoLista[] }) {
  if (lista.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className={['text-[11px] font-bold uppercase tracking-wide pt-1', tom === 'ruim' ? 'text-red-600' : 'text-gray-400'].join(' ')}>{titulo} · {lista.length}</h2>
      {lista.map((os) => <Cartao key={os.id} os={os} />)}
    </section>
  )
}

export function OsList({ ordens }: { ordens: OrdemServicoLista[] }) {
  const pendentes = ordens.filter((os) => !FINAIS.includes(os.status))
  const hoje = pendentes.filter(isHoje)
  const concluidas = ordens.filter((os) => FINAIS.includes(os.status)).reverse()
  const [tab, setTab] = useState<Tab>(hoje.length > 0 ? 'hoje' : 'pendentes')
  const [busca, setBusca] = useState('')
  const [chip, setChip] = useState<'todas' | 'andamento' | 'atrasadas' | 'preventiva' | 'corretiva'>('todas')

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'hoje', label: 'Hoje', count: hoje.length },
    { key: 'pendentes', label: 'Pendentes', count: pendentes.length },
    { key: 'concluidas', label: 'Concluídas', count: concluidas.length },
  ]

  const base = tab === 'pendentes' ? pendentes : tab === 'hoje' ? hoje : concluidas
  const termo = busca.trim().toLowerCase()
  const passaChip = (os: OrdemServicoLista) =>
    chip === 'todas' ? true
    : chip === 'andamento' ? os.status === 'em_andamento'
    : chip === 'atrasadas' ? !isHoje(os) && osAtrasada(os.status, os.dataAgendamento)
    : chip === 'preventiva' ? os.tipo === 'preventiva'
    : os.tipo === 'corretiva'
  // Busca por cliente, endereço, ambiente, tipo de serviço ou número (com ou sem zeros e sigla: "123", "0123", "pm-0123")
  const alvo = (os: OrdemServicoLista) =>
    `${nomeCliente(os)} ${os.ambiente.nome} ${os.ambiente.localizacaoInterna} ${os.enderecoServico?.endereco ?? ''} ${os.tipoServico?.nome ?? ''} ${numeroOs(os)} ${os.numero ?? ''}`.toLowerCase()
  const filtradas = base.filter(passaChip).filter((os) => !termo || termo.split(/\s+/).every((t) => alvo(os).includes(t)))
  type Chip = typeof chip
  const chips = ([
    { key: 'todas', label: 'Todas' },
    { key: 'andamento', label: 'Em andamento' },
    { key: 'atrasadas', label: 'Atrasadas' },
    { key: 'preventiva', label: 'Preventivas' },
    { key: 'corretiva', label: 'Corretivas' },
  ] as { key: Chip; label: string }[]).filter((c) => tab !== 'concluidas' || (c.key !== 'andamento' && c.key !== 'atrasadas'))

  // Em andamento primeiro, depois por horário
  const porHorario = (a: OrdemServicoLista, b: OrdemServicoLista) =>
    (a.status === 'em_andamento' ? 0 : 1) - (b.status === 'em_andamento' ? 0 : 1) || (a.horaInicio ?? '99:99').localeCompare(b.horaInicio ?? '99:99')
  const atrasadas = filtradas.filter((os) => !isHoje(os) && osAtrasada(os.status, os.dataAgendamento))
  const doDia = filtradas.filter(isHoje).sort(porHorario)
  const proximas = filtradas.filter((os) => !isHoje(os) && !osAtrasada(os.status, os.dataAgendamento))

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-xl font-bold text-primary">Minhas O.S.</h1>
        <p className="text-gray-500 text-xs mt-0.5">
          {hoje.length > 0 ? `${hoje.length} para hoje · ` : ''}{pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex gap-1 bg-surface rounded-xl p-1 mb-3 border border-border">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setChip('todas') }}
            className={['flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-colors', tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'].join(' ')}>
            {t.label}
            {t.count > 0 && <span className={['min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1', tab === t.key ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'].join(' ')}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, endereço ou nº da O.S." inputMode="search"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        {busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => setChip(c.key)}
            className={['shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border', chip === c.key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'].join(' ')}>
            {c.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-border">
          <ClipboardList size={36} className="mx-auto text-primary/20 mb-2" />
          <p className="text-gray-400 text-sm">
            {termo || chip !== 'todas' ? 'Nada encontrado com esses filtros.' : tab === 'hoje' ? 'Nenhuma O.S. para hoje.' : tab === 'concluidas' ? 'Nenhuma O.S. concluída.' : 'Nenhuma O.S. pendente.'}
          </p>
        </div>
      ) : tab === 'concluidas' ? (
        <div className="space-y-3">{filtradas.map((os) => <Cartao key={os.id} os={os} />)}</div>
      ) : (
        <div className="space-y-4">
          <Grupo titulo="Atrasadas" tom="ruim" lista={atrasadas} />
          {tab === 'pendentes' ? <Grupo titulo="Hoje" lista={doDia} /> : <div className="space-y-3">{doDia.map((os) => <Cartao key={os.id} os={os} />)}</div>}
          <Grupo titulo="Próximas" lista={proximas} />
        </div>
      )}
    </div>
  )
}
