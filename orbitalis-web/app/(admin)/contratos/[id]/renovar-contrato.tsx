'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, X, Loader2 } from 'lucide-react'
import { carregarRenovacao, renovarContrato, type RenovacaoPreview } from '../actions'

const campo = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40'
const dia = (iso: string) => iso.slice(0, 10)

/**
 * Renovação: cria um contrato novo a partir do atual e mantém o antigo no histórico. Tudo já vem
 * preenchido com os valores atuais (manter) e pode ser alterado: valor, vigência e equipamentos.
 */
export function RenovarContrato({ contratoId }: { contratoId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<RenovacaoPreview | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, start] = useTransition()

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [osMes, setOsMes] = useState('')
  const [obs, setObs] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [visitas, setVisitas] = useState<Record<string, string>>({})

  function abrir() {
    setAberto(true); setErro(null)
    if (dados) return
    start(async () => {
      const r = await carregarRenovacao(contratoId)
      if (!r.ok) { setErro(r.error); return }
      const d = r.dados
      setDados(d)
      setDescricao(d.contrato.descricao)
      setValor(d.contrato.valorMensal != null ? String(d.contrato.valorMensal) : '')
      setOsMes(d.contrato.numOsIncluidas != null ? String(d.contrato.numOsIncluidas) : '')
      setObs(d.contrato.observacoes ?? '')
      setInicio(dia(d.sugestao.vigenciaInicio))
      setFim(dia(d.sugestao.vigenciaFim))
      setMarcados(new Set(d.planos.flatMap((p) => p.equipamentos.map((e) => e.id))))
      setVisitas(Object.fromEntries(d.planos.map((p) => [p.id, p.visitasPrevistas != null ? String(p.visitasPrevistas) : ''])))
    })
  }

  function alternar(id: string) {
    setMarcados((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!dados) return
    if (!inicio || !fim) return setErro('Informe a vigência do novo contrato.')
    if (fim <= inicio) return setErro('O fim da vigência deve ser depois do início.')
    setErro(null)
    // Equipamentos de outros cadastros do cliente que foram marcados entram no primeiro plano
    const extras = dados.outrosEquipamentos.filter((o) => marcados.has(o.id)).map((o) => o.id)
    const planos = dados.planos.map((p, i) => ({
      planoId: p.id,
      equipamentoIds: [...p.equipamentos.filter((q) => marcados.has(q.id)).map((q) => q.id), ...(i === 0 ? extras : [])],
      ...(visitas[p.id] ? { visitasPrevistas: Number(visitas[p.id]) } : {}),
    }))
    start(async () => {
      const r = await renovarContrato(contratoId, {
        descricao: descricao.trim(),
        valorMensal: valor === '' ? null : Number(valor.replace(',', '.')),
        numOsIncluidas: osMes === '' ? null : Number(osMes),
        observacoes: obs.trim() || null,
        vigenciaInicio: inicio, vigenciaFim: fim, planos,
      })
      if (!r.ok) { setErro(r.error); return }
      router.push(`/contratos/${r.id}`)
    })
  }

  const totalEq = dados ? dados.planos.reduce((s, p) => s + p.equipamentos.filter((e) => marcados.has(e.id)).length, 0) + dados.outrosEquipamentos.filter((o) => marcados.has(o.id)).length : 0

  return (
    <>
      <button type="button" onClick={abrir}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity">
        <RefreshCw size={14} aria-hidden="true" /> Renovar contrato
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !pendente) setAberto(false) }}>
          <form onSubmit={confirmar} role="dialog" aria-modal="true" aria-labelledby="ren-titulo"
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 id="ren-titulo" className="text-base font-bold text-gray-900">Renovar contrato</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 overflow-y-auto space-y-5">
              {!dados && !erro && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>}
              {dados?.jaRenovado && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Este contrato já foi renovado.</p>}

              {dados && (
                <>
                  <p className="text-sm text-gray-600">
                    O contrato atual fica no histórico e um novo é criado para <strong>{dados.contrato.cliente.nomeFantasia ?? dados.contrato.cliente.razaoSocial}</strong>.
                    Tudo abaixo já está igual ao contrato atual — altere só o que mudou.
                  </p>

                  <div>
                    <label htmlFor="ren-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input id="ren-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} className={campo} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ren-ini" className="block text-sm font-medium text-gray-700 mb-1">Início da vigência</label>
                      <input id="ren-ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} required />
                    </div>
                    <div>
                      <label htmlFor="ren-fim" className="block text-sm font-medium text-gray-700 mb-1">Fim da vigência</label>
                      <input id="ren-fim" type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className={campo} required />
                    </div>
                    <div>
                      <label htmlFor="ren-valor" className="block text-sm font-medium text-gray-700 mb-1">Valor mensal (R$)</label>
                      <input id="ren-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Sem valor" className={campo} />
                      <p className="text-xs text-gray-500 mt-1">Atual: {dados.contrato.valorMensal != null ? Number(dados.contrato.valorMensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</p>
                    </div>
                    <div>
                      <label htmlFor="ren-os" className="block text-sm font-medium text-gray-700 mb-1">O.S. incluídas por mês</label>
                      <input id="ren-os" type="number" min={0} value={osMes} onChange={(e) => setOsMes(e.target.value)} placeholder="Sem limite" className={campo} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Equipamentos do contrato <span className="text-gray-500 font-normal">({totalEq} selecionado{totalEq === 1 ? '' : 's'})</span></p>
                    {dados.planos.length === 0 && (
                      <p className="text-sm text-gray-500 bg-surface rounded-lg px-3 py-2">Este contrato não tem plano preventivo ativo: será renovado só o contrato (valor e vigência).</p>
                    )}
                    <div className="space-y-4">
                      {dados.planos.map((p) => (
                        <fieldset key={p.id} className="border border-border rounded-lg p-3">
                          <legend className="px-1 text-xs font-semibold text-gray-600">
                            Plano {p.tipoServico?.sigla ?? ''} · a cada {p.frequenciaDias} dias
                          </legend>
                          <div className="flex items-center gap-2 mb-2">
                            <label htmlFor={`vis-${p.id}`} className="text-xs text-gray-600">Visitas por equipamento no período</label>
                            <input id={`vis-${p.id}`} type="number" min={1} max={120} value={visitas[p.id] ?? ''} onChange={(e) => setVisitas((v) => ({ ...v, [p.id]: e.target.value }))}
                              className="w-20 px-2 py-1 border border-border rounded-md text-sm" />
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 max-h-48 overflow-y-auto">
                            {p.equipamentos.map((q) => (
                              <li key={q.id}>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                  <input type="checkbox" checked={marcados.has(q.id)} onChange={() => alternar(q.id)} className="mt-1 accent-primary" />
                                  <span>{q.nome}<span className="block text-xs text-gray-500">{q.ambiente}</span></span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </fieldset>
                      ))}
                    </div>

                    {dados.planos.length > 0 && dados.outrosEquipamentos.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-sm font-medium text-primary cursor-pointer">Incluir outros equipamentos do cliente ({dados.outrosEquipamentos.length})</summary>
                        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 max-h-48 overflow-y-auto">
                          {dados.outrosEquipamentos.map((q) => (
                            <li key={q.id}>
                              <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                <input type="checkbox" checked={marcados.has(q.id)} onChange={() => alternar(q.id)} className="mt-1 accent-primary" />
                                <span>{q.nome}<span className="block text-xs text-gray-500">{q.ambiente}</span></span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ren-obs" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea id="ren-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} className={`${campo} resize-y`} />
                  </div>
                </>
              )}
              {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
            </div>

            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setAberto(false)} disabled={pendente} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
              <button type="submit" disabled={pendente || !dados || dados.jaRenovado}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50">
                {pendente && <Loader2 size={14} className="animate-spin" />} Renovar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
