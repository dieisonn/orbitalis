'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Loader2, Plus, Check, Flag, Trash2, Repeat } from 'lucide-react'
import { instante, DIAS_SEMANA, diaDaSemana, dataBR } from '@/lib/agenda'
import { type Feriado, ROTULO_FERIADO, diaDeFeriado } from '@/lib/feriados'
import { chamar, type TipoOpcao } from './evento-modal'

const COR_FERIADO = '#616161' // Grafite, como no manual da agenda

const chaveDe = (f: Feriado) => `${f.data}|${f.nome}`

export function FeriadosModal({ anoInicial, tipos, cidade, uf, onFechar, onMudou, onFeriadosMudaram }: {
  anoInicial: number; tipos: TipoOpcao[]; cidade: string | null; uf: string | null
  onFechar: () => void
  onMudou: () => void              // eventos da agenda mudaram (lançou FE)
  onFeriadosMudaram: () => void    // lista de feriados mudou (cadastro/remoção)
}) {
  const [ano, setAno] = useState(anoInicial)
  const [lista, setLista] = useState<Feriado[]>([])
  const [invertidos, setInvertidos] = useState<Set<string>>(new Set())          // escolhas da pessoa sobre o padrão
  const [carregando, setCarregando] = useState(true)
  const [lancando, setLancando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [novoData, setNovoData] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<'municipal' | 'estadual' | 'personalizado'>('municipal')
  const [novoRecorrente, setNovoRecorrente] = useState(true)

  const tipoFE = tipos.find((t) => t.sigla === 'FE' && t.ativo)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  // Feriados do ano, já com a indicação de quais estão lançados na agenda (tudo vem da API)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCarregando(true)
      try {
        const feriados = (await chamar('GET', `/feriados?ano=${ano}`)) as Feriado[]
        if (!vivo) return
        setLista(feriados); setMsg(null)
      } catch (e) {
        if (vivo) setMsg({ tipo: 'erro', texto: e instanceof Error && !/404|Cannot GET/i.test(e.message) ? e.message : 'Os feriados ainda não estão disponíveis: o servidor precisa da atualização mais recente.' })
      } finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [ano, recarga])

  const linhas = lista

  // por padrão fica marcado o que ainda não está na agenda, exceto ponto facultativo
  const padrao = (f: Feriado) => f.tipo !== 'facultativo' && !f.lancado
  const marcado = (f: Feriado) => padrao(f) !== invertidos.has(chaveDe(f))
  const alternar = (f: Feriado) => setInvertidos((s) => { const n = new Set(s); if (n.has(chaveDe(f))) n.delete(chaveDe(f)); else n.add(chaveDe(f)); return n })
  const aLancar = linhas.filter((f) => marcado(f) && !f.lancado)
  const mudarAno = (a: number) => { setAno(a); setInvertidos(new Set()) }

  async function adicionar() {
    setMsg(null)
    if (!novoData || novoNome.trim().length < 2) return setMsg({ tipo: 'erro', texto: 'Informe a data e o nome do feriado.' })
    setSalvando(true)
    try {
      await chamar('POST', '/feriados', { data: novoData, nome: novoNome.trim(), tipo: novoTipo, recorrente: novoRecorrente })
      const y = Number(novoData.slice(0, 4))
      setNovoData(''); setNovoNome('')
      onFeriadosMudaram()
      if (y !== ano) mudarAno(y); else setRecarga((r) => r + 1)
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível cadastrar' })
    } finally { setSalvando(false) }
  }

  const remover = useCallback(async (f: Feriado) => {
    if (!f.id) return
    const aviso = f.recorrente ? `Remover "${f.nome}"? Ele deixa de aparecer em todos os anos.` : `Remover "${f.nome}"?`
    if (!confirm(aviso)) return
    setMsg(null)
    try {
      await chamar('DELETE', `/feriados/${f.id}`)
      onFeriadosMudaram(); setRecarga((r) => r + 1)
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível remover' })
    }
  }, [onFeriadosMudaram])

  async function lancar() {
    setMsg(null); setLancando(true)
    let criados = 0
    try {
      for (const f of aLancar) {
        const d = diaDeFeriado(f)
        await chamar('POST', '/agenda', {
          titulo: `FE - ${f.nome}`,
          descricao: ROTULO_FERIADO[f.tipo],
          inicio: instante(d.y, d.m, d.d, 0, 0),
          fim: instante(d.y, d.m, d.d + 1, 0, 0),
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
          <p className="text-xs text-gray-700 mt-1">
            Os feriados já aparecem sinalizados na agenda. Aqui você cadastra os da sua cidade, estado ou da empresa e lança na agenda os dias em que a equipe não trabalha (tipo FE, em Grafite).
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => mudarAno(ano - 1)} aria-label="Ano anterior" className="p-1.5 border border-border rounded-lg hover:bg-surface"><ChevronLeft size={16} /></button>
            <span className="text-base font-semibold w-16 text-center">{ano}</span>
            <button onClick={() => mudarAno(ano + 1)} aria-label="Próximo ano" className="p-1.5 border border-border rounded-lg hover:bg-surface"><ChevronRight size={16} /></button>
            {carregando && <Loader2 size={15} className="animate-spin text-gray-500" />}
          </div>

          <ul className="border border-border rounded-xl divide-y divide-border">
            {linhas.length === 0 && !carregando && <li className="px-3 py-4 text-sm text-gray-600 text-center">Nenhum feriado para exibir.</li>}
            {linhas.map((f) => {
              const ja = !!f.lancado
              const d = diaDeFeriado(f)
              return (
                <li key={chaveDe(f)} className={`flex items-center gap-3 px-3 py-2 text-sm ${ja ? 'bg-surface/60' : 'hover:bg-surface'}`}>
                  {ja
                    ? <Check size={16} className="text-green-600 shrink-0" aria-label="Já está na agenda" />
                    : <input type="checkbox" checked={marcado(f)} onChange={() => alternar(f)} aria-label={`Lançar ${f.nome} na agenda`} className="accent-action w-4 h-4 shrink-0" />}
                  <span className="w-20 shrink-0 tabular-nums text-gray-700">{dataBR(d).slice(0, 5)} <span className="text-gray-500 text-xs">{DIAS_SEMANA[diaDaSemana(d)]}</span></span>
                  <span className="flex-1 min-w-0 text-gray-900">
                    {f.nome}
                    {f.recorrente && <Repeat size={12} className="inline ml-1.5 -mt-0.5 text-gray-500" aria-label="Repete todo ano" />}
                  </span>
                  <span className="text-[11px] text-gray-600 border border-border rounded-full px-2 py-0.5 shrink-0">{ja ? 'Na agenda' : ROTULO_FERIADO[f.tipo]}</span>
                  {f.id && (
                    <button onClick={() => remover(f)} aria-label={`Remover ${f.nome}`} title="Remover"
                      className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 shrink-0"><Trash2 size={14} /></button>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Cadastrar feriado</p>
            <p className="text-xs text-gray-600">
              {cidade && uf
                ? <>Município da empresa: <strong>{cidade}/{uf}</strong>. </>
                : <>Informe a cidade e o estado da empresa em <Link href="/configuracoes" className="text-action underline">Configurações</Link>. </>}
              Cada feriado é cadastrado uma vez; marcando “Repete todo ano”, ele vale para todos os anos.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input type="date" value={novoData} onChange={(e) => setNovoData(e.target.value)} aria-label="Data do feriado" className={campo} />
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} aria-label="Nome do feriado" placeholder="Ex.: Aniversário da cidade" maxLength={150}
                className={`${campo} flex-1 min-w-[10rem]`} onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }} />
              <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as typeof novoTipo)} aria-label="Tipo do feriado" className={campo}>
                <option value="municipal">Municipal</option>
                <option value="estadual">Estadual</option>
                <option value="personalizado">Recesso da empresa</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={novoRecorrente} onChange={(e) => setNovoRecorrente(e.target.checked)} className="accent-action w-4 h-4" /> Repete todo ano
              </label>
              <button onClick={adicionar} disabled={salvando}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-semibold text-gray-700 hover:bg-surface disabled:opacity-60">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Cadastrar
              </button>
            </div>
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
