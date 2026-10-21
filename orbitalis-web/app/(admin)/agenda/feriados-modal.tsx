'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2, Search, Plus, Check, Flag } from 'lucide-react'
import { type Dia, type EventoAgenda, chaveDia, instante, relogio, DIAS_SEMANA, diaDaSemana, dataBR } from '@/lib/agenda'
import { type Feriado, type TipoFeriado, ROTULO_FERIADO, feriadosNacionais } from '@/lib/feriados'
import { chamar, type TipoOpcao } from './evento-modal'

const COR_FERIADO = '#616161' // Grafite, como no manual da agenda
const CHAVE_IBGE = 'orbitalis-ibge'

const ehFeriadoNaAgenda = (e: EventoAgenda) => e.tipoServico?.sigla === 'FE' || /^FE\s*-\s*/i.test(e.titulo)
const nomeSemPrefixo = (t: string) => t.replace(/^FE\s*-\s*/i, '')

export function FeriadosModal({ anoInicial, tipos, onFechar, onMudou }: {
  anoInicial: number; tipos: TipoOpcao[]; onFechar: () => void; onMudou: () => void
}) {
  const [ano, setAno] = useState(anoInicial)
  const [extras, setExtras] = useState<Feriado[]>([])          // municipais/estaduais buscados ou cadastrados
  const [naAgenda, setNaAgenda] = useState<Record<string, EventoAgenda>>({})  // data → evento FE já lançado
  const [invertidos, setInvertidos] = useState<Set<string>>(new Set())   // escolhas da pessoa sobre o padrão
  const [carregando, setCarregando] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [lancando, setLancando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [ibge, setIbge] = useState(() => { try { return localStorage.getItem(CHAVE_IBGE) ?? '' } catch { return '' } })
  const [novoData, setNovoData] = useState('')
  const [novoNome, setNovoNome] = useState('')

  const mudarAno = (a: number) => { setAno(a); setInvertidos(new Set()) }
  const tipoFE = tipos.find((t) => t.sigla === 'FE' && t.ativo)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  // Feriados já lançados na agenda neste ano
  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCarregando(true)
      try {
        const q = `/agenda?inicio=${encodeURIComponent(instante(ano, 0, 1))}&fim=${encodeURIComponent(instante(ano + 1, 0, 1))}`
        const lista: EventoAgenda[] = await chamar('GET', q)
        const mapa: Record<string, EventoAgenda> = {}
        for (const e of lista) if (ehFeriadoNaAgenda(e)) mapa[chaveDia(relogio(e.inicio))] = e
        if (vivo) setNaAgenda(mapa)
      } catch (e) {
        if (vivo) setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível ler a agenda' })
      } finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [ano])

  // Lista do ano: nacionais + extras (sem repetir a mesma data/nome)
  const lista = useMemo(() => {
    const base = feriadosNacionais(ano)
    const vistos = new Set(base.map((f) => `${chaveDia(f.data)}|${f.nome.toLowerCase()}`))
    const adicionais = extras.filter((f) => f.data.y === ano && !vistos.has(`${chaveDia(f.data)}|${f.nome.toLowerCase()}`))
    // feriados que já estão na agenda mas não vieram de nenhuma lista
    const conhecidas = new Set([...base, ...adicionais].map((f) => chaveDia(f.data)))
    const soAgenda: Feriado[] = Object.entries(naAgenda)
      .filter(([k]) => !conhecidas.has(k))
      .map(([, e]) => ({ data: relogio(e.inicio), nome: nomeSemPrefixo(e.titulo), tipo: 'municipal' as TipoFeriado }))
    return [...base, ...adicionais, ...soAgenda].sort((a, b) => chaveDia(a.data).localeCompare(chaveDia(b.data)))
  }, [ano, extras, naAgenda])

  const chaveDe = (f: Feriado) => `${chaveDia(f.data)}|${f.nome}`
  // por padrão fica marcado o que ainda não está na agenda, exceto ponto facultativo
  const padrao = (f: Feriado) => f.tipo !== 'facultativo' && !naAgenda[chaveDia(f.data)]
  const marcado = (f: Feriado) => padrao(f) !== invertidos.has(chaveDe(f))
  const alternar = (f: Feriado) => setInvertidos((s) => { const n = new Set(s); if (n.has(chaveDe(f))) n.delete(chaveDe(f)); else n.add(chaveDe(f)); return n })
  const aLancar = lista.filter((f) => marcado(f) && !naAgenda[chaveDia(f.data)])

  async function buscar() {
    setMsg(null)
    if (!/^\d{7}$/.test(ibge.trim())) return setMsg({ tipo: 'erro', texto: 'O código IBGE tem 7 dígitos (ex.: 3550308 = São Paulo).' })
    setBuscando(true)
    try {
      try { localStorage.setItem(CHAVE_IBGE, ibge.trim()) } catch { /* ok */ }
      const res = await fetch(`/api/feriados?ibge=${ibge.trim()}&ano=${ano}`, { cache: 'no-store' })
      const dados = await res.json().catch(() => null)
      if (!res.ok) throw new Error(dados?.message ?? `Erro ${res.status}`)
      const recebidos: Feriado[] = (dados as { data: string; nome: string; tipo: string }[])
        .filter((x) => x.tipo === 'municipal' || x.tipo === 'estadual')
        .map((x) => { const [y, m, d] = x.data.split('-').map(Number); return { data: { y, m: m - 1, d }, nome: x.nome, tipo: x.tipo as TipoFeriado } })
      setExtras((atual) => [...atual.filter((a) => !recebidos.some((r) => chaveDia(r.data) === chaveDia(a.data) && r.nome === a.nome)), ...recebidos])
      setMsg({ tipo: 'ok', texto: recebidos.length ? `${recebidos.length} feriado(s) municipal/estadual encontrado(s) para ${ano}.` : 'Nenhum feriado municipal ou estadual encontrado para essa cidade.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro na busca' })
    } finally { setBuscando(false) }
  }

  function adicionarManual() {
    setMsg(null)
    const [y, m, d] = novoData.split('-').map(Number)
    if (!y || !novoNome.trim()) return setMsg({ tipo: 'erro', texto: 'Informe a data e o nome do feriado.' })
    mudarAno(y)
    setExtras((a) => [...a, { data: { y, m: m - 1, d }, nome: novoNome.trim(), tipo: 'municipal' }])
    setNovoData(''); setNovoNome('')
  }

  async function lancar() {
    setMsg(null); setLancando(true)
    let criados = 0
    try {
      for (const f of aLancar) {
        await chamar('POST', '/agenda', {
          titulo: `FE - ${f.nome}`,
          descricao: ROTULO_FERIADO[f.tipo],
          inicio: instante(f.data.y, f.data.m, f.data.d, 0, 0),
          fim: instante(f.data.y, f.data.m, f.data.d + 1, 0, 0),
          diaInteiro: true,
          tipoServicoId: tipoFE?.id ?? null,
          ...(tipoFE ? {} : { cor: COR_FERIADO }),
        })
        criados++
      }
      onMudou(); onFechar()
    } catch (e) {
      if (criados > 0) onMudou()
      setMsg({ tipo: 'erro', texto: `${e instanceof Error ? e.message : 'Erro ao lançar'}${criados ? ` — ${criados} de ${aLancar.length} foram lançados.` : ''}` })
      setLancando(false)
    }
  }

  const campo = 'px-3 py-2 bg-white border border-border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-action/30 focus:border-action'

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/45 flex items-center justify-center p-3 sm:p-4" onClick={onFechar}>
      <div role="dialog" aria-modal="true" aria-label="Feriados"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-3 pb-4 border-t-[6px] rounded-t-2xl" style={{ borderTopColor: COR_FERIADO, backgroundColor: `${COR_FERIADO}1F` }}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Flag size={17} /> Feriados</h2>
            <button onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-black/5"><X size={18} /></button>
          </div>
          <p className="text-xs text-gray-700 mt-1">Os feriados nacionais já aparecem sinalizados na agenda. Aqui você lança na agenda os que a equipe não trabalha (tipo FE, em Grafite) e cadastra os municipais.</p>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => mudarAno(ano - 1)} aria-label="Ano anterior" className="p-1.5 border border-border rounded-lg hover:bg-surface"><ChevronLeft size={16} /></button>
            <span className="text-base font-semibold w-16 text-center">{ano}</span>
            <button onClick={() => mudarAno(ano + 1)} aria-label="Próximo ano" className="p-1.5 border border-border rounded-lg hover:bg-surface"><ChevronRight size={16} /></button>
            {carregando && <Loader2 size={15} className="animate-spin text-gray-500" />}
          </div>

          <ul className="border border-border rounded-xl divide-y divide-border">
            {lista.map((f) => {
              const k = chaveDia(f.data)
              const ja = !!naAgenda[k]
              return (
                <li key={chaveDe(f)}>
                  <label className={`flex items-center gap-3 px-3 py-2 text-sm ${ja ? 'bg-surface/60' : 'hover:bg-surface cursor-pointer'}`}>
                    {ja
                      ? <Check size={16} className="text-green-600 shrink-0" aria-label="Já está na agenda" />
                      : <input type="checkbox" checked={marcado(f)} onChange={() => alternar(f)} className="accent-action w-4 h-4 shrink-0" />}
                    <span className="w-20 shrink-0 tabular-nums text-gray-700">{dataBR(f.data).slice(0, 5)} <span className="text-gray-500 text-xs">{DIAS_SEMANA[diaDaSemana(f.data)]}</span></span>
                    <span className="flex-1 min-w-0 text-gray-900">{f.nome}</span>
                    <span className="text-[11px] text-gray-600 border border-border rounded-full px-2 py-0.5 shrink-0">{ja ? 'Na agenda' : ROTULO_FERIADO[f.tipo]}</span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Feriados municipais e estaduais</p>
            <div className="flex flex-wrap gap-2 items-center">
              <input value={ibge} onChange={(e) => setIbge(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric"
                aria-label="Código IBGE da cidade" placeholder="Código IBGE da cidade" className={`${campo} w-48`} />
              <button onClick={buscar} disabled={buscando}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-semibold text-gray-700 hover:bg-surface disabled:opacity-60">
                {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar da internet
              </button>
              <a href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" target="_blank" rel="noopener noreferrer" className="text-xs text-action underline">Qual é o código da minha cidade?</a>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input type="date" value={novoData} onChange={(e) => setNovoData(e.target.value)} aria-label="Data do feriado" className={campo} />
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} aria-label="Nome do feriado" placeholder="Ex.: Aniversário da cidade" className={`${campo} flex-1 min-w-[10rem]`}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionarManual() }} />
              <button onClick={adicionarManual}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-semibold text-gray-700 hover:bg-surface">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <p className="text-[11px] text-gray-600">A busca usa a FeriadosAPI (o plano gratuito deles cobre as capitais). Se não achar sua cidade, cadastre à mão: vale para o ano inteiro que você escolher acima.</p>
          </div>

          {msg && (
            <p role={msg.tipo === 'erro' ? 'alert' : 'status'}
              className={`text-sm px-3 py-2 rounded-lg ${msg.tipo === 'erro' ? 'text-destructive bg-destructive/10' : 'text-green-800 bg-green-50'}`}>{msg.texto}</p>
          )}
          {!tipoFE && (
            <p className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Ainda não existe o tipo de serviço <strong>FE — Feriado</strong>. Os feriados serão lançados em Grafite mesmo assim; para filtrar por tipo, crie o FE em Ajustes → Tipos de serviço.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
          <span className="text-xs text-gray-600">{aLancar.length} para lançar na agenda</span>
          <div className="flex gap-2">
            <button onClick={onFechar} className="px-5 py-2 text-gray-700 font-semibold rounded-lg text-sm hover:bg-surface">Fechar</button>
            <button onClick={lancar} disabled={lancando || aLancar.length === 0}
              className="px-5 py-2 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-50">
              {lancando ? <Loader2 size={14} className="animate-spin inline" /> : `Lançar ${aLancar.length} na agenda`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
