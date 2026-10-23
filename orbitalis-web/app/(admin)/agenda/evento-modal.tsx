'use client'

import { EnderecoInput } from '@/components/ui/endereco-input'
import { useEffect, useState } from 'react'
import { X, MapPin, Loader2, User, Clock, Building2, Repeat, AlignLeft, Palette, Wrench } from 'lucide-react'
import {
  type EventoAgenda, type Dia, relogio, instante, hoje,
  duracaoLegivel, COR_PADRAO,
  gerarOcorrencias, MAX_REPETICOES, DIAS_SEMANA, dataBR, diaDaSemana, type Regra, type Unidade,
} from '@/lib/agenda'
import { textoSobre } from '@/lib/cor'
import { PaletaCor } from './paleta-cor'
import { ClienteSelect } from '@/components/ui/cliente-select'

export type TipoOpcao = { id: string; sigla: string; nome: string; corHex: string; duracaoMinutos: number; ativo: boolean }
export type ClienteOpcao = { id: string; razaoSocial: string; nomeFantasia: string | null; endereco: string; telefone: string | null }
export type TecnicoOpcao = { id: string; email: string; nome: string | null }

type Props = {
  evento: EventoAgenda | null          // null = novo
  modelo?: EventoAgenda | null         // ao duplicar: evento de onde copiar os campos
  inicioSugerido?: string              // ISO — usado no novo
  fimSugerido?: string                 // ISO — fim do intervalo arrastado na grade (novo)
  tipos: TipoOpcao[]
  clientes: ClienteOpcao[]
  tecnicos: TecnicoOpcao[]
  onFechar: () => void
  onMudou: () => void                  // recarrega a agenda
}

export async function chamar(method: string, path: string, body?: object) {
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

export function EventoModal({ evento, modelo, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou }: Props) {
  // Esc fecha, como no Google Agenda
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/45 flex items-center justify-center p-3 sm:p-4" onClick={onFechar}>
      <div
        role="dialog" aria-modal="true" aria-label={evento ? 'Editar evento' : 'Novo evento'}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Formulario {...{ evento, modelo, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou }} onCancelar={onFechar} />
      </div>
    </div>
  )
}

function Linha({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2.5 w-4 shrink-0 text-gray-500">{icone}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function Formulario({ evento, modelo = null, inicioSugerido, fimSugerido, tipos, clientes, tecnicos, onFechar, onMudou, onCancelar }: Props & { onCancelar: () => void }) {
  const ehOs = !!evento?.ordemServico
  const origem = evento ?? modelo   // de onde vêm os valores iniciais (editar ou duplicar)
  const h0 = hoje()
  const base = origem ? origem.inicio : (inicioSugerido ?? instante(h0.y, h0.m, h0.d, 8, 0))
  const rIni = relogio(base)
  const rFim = relogio(origem ? origem.fim : base)

  const [tipoId, setTipoId] = useState(origem?.tipoServico?.id ?? '')
  const [clienteId, setClienteId] = useState(origem?.cliente?.id ?? '')
  const [titulo, setTitulo] = useState(origem?.titulo ?? '')
  const [local, setLocal] = useState(origem?.local ?? '')
  const [descricao, setDescricao] = useState(origem?.descricao ?? '')
  const [tecnicoId, setTecnicoId] = useState(origem?.tecnico?.id ?? '')
  // cor própria do evento; null = padrão (a do tipo de serviço)
  const [corPropria, setCorPropria] = useState<string | null>(
    origem && origem.corHex.toLowerCase() !== (origem.tipoServico?.corHex ?? COR_PADRAO).toLowerCase() ? origem.corHex : null,
  )
  const [diaInteiro, setDiaInteiro] = useState(origem?.diaInteiro ?? false)
  const [data, setData] = useState(dataInput(rIni))
  const [horaIni, setHoraIni] = useState(`${String(rIni.hh).padStart(2, '0')}:${String(rIni.mm).padStart(2, '0')}`)
  const rFimSug = !evento && fimSugerido ? relogio(fimSugerido) : null
  const [horaFim, setHoraFim] = useState(
    origem ? `${String(rFim.hh).padStart(2, '0')}:${String(rFim.mm).padStart(2, '0')}`
      : rFimSug ? `${String(rFimSug.hh).padStart(2, '0')}:${String(rFimSug.mm).padStart(2, '0')}` : '',
  )
  // fim vindo do arrasto vale como "já escolhido": o tipo de serviço não o sobrescreve
  const [tocou, setTocou] = useState({ titulo: !!origem, local: !!origem, fim: !!origem || !!rFimSug })
  const [salvando, setSalvando] = useState(false)
  // Repetição (só em evento novo ou duplicado)
  const [repete, setRepete] = useState<'nao' | 'dia' | 'util' | 'semana' | 'mes' | 'ano' | 'custom'>('nao')
  const [intervalo, setIntervalo] = useState(1)
  const [unidade, setUnidade] = useState<Unidade>('semana')
  const [diasSem, setDiasSem] = useState<number[]>([])
  const [termino, setTermino] = useState<'vezes' | 'ate'>('vezes')
  const [vezes, setVezes] = useState(10)
  const [ate, setAte] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const tipo = tipos.find((t) => t.id === tipoId)
  const corPadrao = tipo?.corHex ?? COR_PADRAO
  const corEfetiva = corPropria ?? corPadrao
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

  const diaBase: Dia | null = (() => { const [y, m, d] = data.split('-').map(Number); return y ? { y, m: m - 1, d } : null })()
  const regra: Regra | null = (() => {
    if (repete === 'nao' || !diaBase) return null
    const fim: Regra['fim'] = termino === 'vezes'
      ? { tipo: 'vezes', vezes }
      : { tipo: 'ate', ate: (() => { const [y, m, d] = ate.split('-').map(Number); return { y, m: m - 1, d } })() }
    if (repete === 'dia') return { intervalo: 1, unidade: 'dia', diasSemana: [], fim }
    if (repete === 'util') return { intervalo: 1, unidade: 'semana', diasSemana: [1, 2, 3, 4, 5], fim }
    if (repete === 'semana') return { intervalo: 1, unidade: 'semana', diasSemana: [diaDaSemana(diaBase)], fim }
    if (repete === 'mes') return { intervalo: 1, unidade: 'mes', diasSemana: [], fim }
    if (repete === 'ano') return { intervalo: 1, unidade: 'ano', diasSemana: [], fim }
    return { intervalo, unidade, diasSemana: unidade === 'semana' ? (diasSem.length ? diasSem : [diaDaSemana(diaBase)]) : [], fim }
  })()
  const ocorrencias: Dia[] = regra && (termino === 'vezes' || ate) ? gerarOcorrencias(diaBase!, regra) : (diaBase ? [diaBase] : [])

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
          cor: corPropria,
        })
      } else {
        if (regra && termino === 'ate' && !ate) { setSalvando(false); return setErro('Informe até quando repetir') }
        if (ocorrencias.length > MAX_REPETICOES) { setSalvando(false); return setErro(`No máximo ${MAX_REPETICOES} repetições por vez`) }
        const [hi, mi] = horaIni.split(':').map(Number)
        const [hf, mf] = fimEfetivo.split(':').map(Number)
        const lista = ocorrencias.length ? ocorrencias : [{ y, m: mo - 1, d }]
        let criados = 0
        try {
          for (const o of lista) {
            await chamar('POST', '/agenda', {
              titulo: titulo.trim() || undefined,
              descricao: descricao.trim() || null,
              local: local.trim() || null,
              inicio: diaInteiro ? instante(o.y, o.m, o.d, 0, 0) : instante(o.y, o.m, o.d, hi, mi),
              fim: diaInteiro ? instante(o.y, o.m, o.d + 1, 0, 0) : instante(o.y, o.m, o.d, hf, mf),
              diaInteiro,
              tecnicoId: tecnicoId || null,
              tipoServicoId: tipoId || null,
              clienteId: clienteId || null,
              ...(corPropria ? { cor: corPropria } : {}),
            })
            criados++
          }
        } catch (err) {
          if (criados > 0) onMudou()
          const base = err instanceof Error ? err.message : 'Erro ao salvar'
          setErro(criados > 0 ? `${base} — ${criados} de ${lista.length} eventos foram criados.` : base)
          setSalvando(false)
          return
        }
      }
      onMudou(); onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
      setSalvando(false)
    }
  }

  const campo = 'w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-action/30 focus:border-action disabled:bg-surface disabled:text-gray-500'
  const rot = 'block text-xs font-medium text-gray-600 mb-1'
  return (
    <>
      {/* Cabeçalho com a cor do evento: muda ao escolher o tipo ou uma cor */}
      <div className="px-5 pt-3 pb-4 border-t-[6px] transition-colors" style={{ borderTopColor: corEfetiva, backgroundColor: `${corEfetiva}1F` }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-gray-600">{evento ? 'Editar evento' : modelo ? 'Duplicar evento' : 'Novo evento'}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="p-1 -mr-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-black/5"><X size={18} /></button>
        </div>
        <input value={titulo} aria-label="Título do evento" placeholder="Adicionar título"
          onChange={(e) => { setTitulo(e.target.value); setTocou((t) => ({ ...t, titulo: true })) }}
          className="w-full bg-transparent text-[22px] font-semibold text-gray-900 placeholder:text-gray-500 border-0 border-b-2 border-transparent focus:border-action focus:outline-none px-0 py-1" />
        {!origem && <p className="text-[11px] text-gray-600 mt-1">Em branco, usa “SIGLA - Cliente” automaticamente.</p>}
        {ehOs && (
          <p className="text-xs text-gray-700 bg-white/70 border border-border rounded-lg px-3 py-2 mt-2">
            Evento da O.S. {evento!.ordemServico!.numero}: data, horário e técnico atualizam a O.S.
          </p>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        <Linha icone={<Wrench size={16} />}>
          <div className="flex flex-wrap gap-1.5 pt-0.5" role="group" aria-label="Tipo de serviço">
            {[{ id: '', sigla: '', nome: 'Sem tipo', corHex: '#6b7280', duracaoMinutos: 60, ativo: true } as TipoOpcao, ...tipos.filter((t) => t.ativo || t.id === tipoId)].map((t) => {
              const sel = tipoId === t.id
              return (
                <button key={t.id || 'nenhum'} type="button" disabled={ehOs} aria-pressed={sel} title={t.nome}
                  onClick={() => { setTipoId(t.id); aplicar(tipos.find((x) => x.id === t.id), cliente) }}
                  style={sel && t.id ? { backgroundColor: t.corHex, borderColor: t.corHex, color: textoSobre(t.corHex) } : undefined}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm font-medium transition-colors disabled:opacity-60 ${
                    sel ? (t.id ? '' : 'bg-gray-800 border-gray-800 text-white') : 'bg-white border-border text-gray-700 hover:bg-surface'}`}>
                  {t.id && !sel && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.corHex }} />}
                  {t.id ? t.sigla : 'Sem tipo'}
                  {t.id && <span className={`hidden sm:inline font-normal ${sel ? '' : 'text-gray-600'}`}>{t.nome}</span>}
                </button>
              )
            })}
          </div>
          {tipo && !diaInteiro && (
            <p className="text-[11px] text-gray-600 mt-1.5">Duração padrão de {tipo.nome}: {duracaoLegivel(tipo.duracaoMinutos)} (ajustável em Tipos de Serviço).</p>
          )}
        </Linha>

        <Linha icone={<Building2 size={16} />}>
          <ClienteSelect ariaLabel="Cliente" value={clienteId} disabled={ehOs} clientes={clientes} vazio="Cliente (opcional)"
            onChange={(id) => { const c = clientes.find((x) => x.id === id); setClienteId(id); aplicar(tipo, c) }} />
        </Linha>

        <Linha icone={<Clock size={16} />}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className={rot} htmlFor="ev-data">Data</label>
              <input id="ev-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={rot} htmlFor="ev-ini">Início</label>
              <input id="ev-ini" type="time" value={horaIni} disabled={diaInteiro} className={campo}
                onChange={(e) => { setHoraIni(e.target.value); if (!tocou.fim) setHoraFim(somar(e.target.value, tipo?.duracaoMinutos ?? 60)) }} />
            </div>
            <div>
              <label className={rot} htmlFor="ev-fim">Fim</label>
              <input id="ev-fim" type="time" value={diaInteiro ? '' : (horaFim || fimEfetivo)} disabled={diaInteiro} className={campo}
                onChange={(e) => { setHoraFim(e.target.value); setTocou((t) => ({ ...t, fim: true })) }} />
            </div>
          </div>
          {!ehOs && (
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-2.5">
              <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} className="accent-action w-4 h-4" /> Dia inteiro
            </label>
          )}
        </Linha>

        {!evento && (
          <Linha icone={<Repeat size={16} />}>
          <div className="space-y-2">
            <span className="sr-only"><label htmlFor="repete">Repetir</label></span>
            <select id="repete" value={repete} onChange={(e) => setRepete(e.target.value as typeof repete)} className={campo}>
              <option value="nao">Não repete</option>
              <option value="dia">Todos os dias</option>
              <option value="util">Todos os dias úteis (seg a sex)</option>
              <option value="semana">Toda semana{diaBase ? ` (${DIAS_SEMANA[diaDaSemana(diaBase)]})` : ''}</option>
              <option value="mes">Todo mês{diaBase ? ` (dia ${diaBase.d})` : ''}</option>
              <option value="ano">Todo ano{diaBase ? ` (${String(diaBase.d).padStart(2, '0')}/${String(diaBase.m + 1).padStart(2, '0')})` : ''}</option>
              <option value="custom">Personalizado…</option>
            </select>

            {repete === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span>A cada</span>
                <input type="number" min={1} max={99} value={intervalo} aria-label="Intervalo de repetição"
                  onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))} className={`${campo} !w-16`} />
                <select value={unidade} aria-label="Unidade de repetição" onChange={(e) => setUnidade(e.target.value as Unidade)} className={`${campo} !w-auto`}>
                  <option value="dia">dia(s)</option>
                  <option value="semana">semana(s)</option>
                  <option value="mes">mês(es)</option>
                  <option value="ano">ano(s)</option>
                </select>
              </div>
            )}
            {repete === 'custom' && unidade === 'semana' && (
              <div className="flex gap-1.5" role="group" aria-label="Dias da semana">
                {DIAS_SEMANA.map((nome, i) => {
                  const on = diasSem.includes(i) || (!diasSem.length && diaBase && diaDaSemana(diaBase) === i)
                  return (
                    <button key={i} type="button" aria-pressed={!!on}
                      onClick={() => setDiasSem((v) => { const base = v.length ? v : (diaBase ? [diaDaSemana(diaBase)] : []); return base.includes(i) ? base.filter((x) => x !== i) : [...base, i] })}
                      className={`w-9 h-8 text-xs font-semibold rounded-md border ${on ? 'bg-action text-white border-action' : 'bg-white text-gray-700 border-border hover:bg-surface'}`}>
                      {nome.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            )}

            {repete !== 'nao' && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span>Termina</span>
                <select value={termino} aria-label="Quando termina" onChange={(e) => setTermino(e.target.value as 'vezes' | 'ate')} className={`${campo} !w-auto`}>
                  <option value="vezes">após</option>
                  <option value="ate">em</option>
                </select>
                {termino === 'vezes' ? (
                  <>
                    <input type="number" min={1} max={MAX_REPETICOES} value={vezes} aria-label="Número de ocorrências"
                      onChange={(e) => setVezes(Math.max(1, Math.min(MAX_REPETICOES, Number(e.target.value) || 1)))} className={`${campo} !w-20`} />
                    <span>ocorrência(s)</span>
                  </>
                ) : (
                  <input type="date" value={ate} min={data} aria-label="Repetir até" onChange={(e) => setAte(e.target.value)} className={`${campo} !w-auto`} />
                )}
              </div>
            )}
            {regra && (
              <p className="text-[11px] text-gray-500">
                {ocorrencias.length > MAX_REPETICOES
                  ? `Passa do limite de ${MAX_REPETICOES} eventos por vez. Reduza o período.`
                  : ocorrencias.length > 1
                    ? `Serão criados ${ocorrencias.length} eventos, de ${dataBR(ocorrencias[0])} a ${dataBR(ocorrencias[ocorrencias.length - 1])}. Cada um é independente: depois pode ser editado ou excluído sozinho.`
                    : 'Nenhuma repetição no período escolhido.'}
              </p>
            )}
          </div>
          </Linha>
        )}

        <Linha icone={<MapPin size={16} />}>
          <EnderecoInput value={local} className={campo}
            onChange={(v) => { setLocal(v); setTocou((t) => ({ ...t, local: true })) }} />
        </Linha>

        <Linha icone={<User size={16} />}>
          <select aria-label="Técnico" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={campo}>
            <option value="">Sem técnico</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
          </select>
        </Linha>

        <Linha icone={<AlignLeft size={16} />}>
          <textarea aria-label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className={campo}
            placeholder="Detalhes do atendimento, observações, o que levar…" />
        </Linha>

        <Linha icone={<Palette size={16} />}>
          <PaletaCor atual={corPropria} padrao={corPadrao} onEscolher={setCorPropria} />
        </Linha>

        {erro && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg" role="alert">{erro}</p>}
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-3 bg-white border-t border-border">
        <button onClick={onCancelar} disabled={salvando}
          className="px-5 py-2 text-gray-700 font-semibold rounded-lg text-sm hover:bg-surface">
          Cancelar
        </button>
        <button onClick={salvar} disabled={salvando}
          className="px-6 py-2 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 min-w-[7rem]">
          {salvando ? <Loader2 size={14} className="animate-spin inline" /> : (ocorrencias.length > 1 && !evento ? `Criar ${ocorrencias.length} eventos` : 'Salvar')}
        </button>
      </div>
    </>
  )
}
