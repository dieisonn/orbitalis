'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft } from 'lucide-react'
import { cargaMembro, transferirOs, type CargaMembro } from './actions'

type Destino = { id: string; nome: string | null; email: string }

// Passa tudo que o técnico ainda tem em aberto (O.S., planos preventivos, agenda) para outro membro — ex.: desligamento
export function TransferirOs({ userId, nome, destinos }: { userId: string; nome: string; destinos: Destino[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carga, setCarga] = useState<CargaMembro | null>(null)
  const [para, setPara] = useState('')
  const [remover, setRemover] = useState(false)
  const [escopo, setEscopo] = useState<'pendentes' | 'todas'>('pendentes')
  const [porPeriodo, setPorPeriodo] = useState(false)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  const [pendente, start] = useTransition()

  const filtro = { escopo, de: porPeriodo && de ? de : undefined, ate: porPeriodo && ate ? ate : undefined }
  const periodoInvertido = porPeriodo && !!de && !!ate && ate < de

  function abrir() {
    setAberto(true); setErro(null); setFeito(null)
    cargaMembro(userId).then(setCarga)
  }

  // Prévia: quantas O.S. entram no critério escolhido
  useEffect(() => {
    if (!aberto || feito || periodoInvertido) return
    let ativo = true
    cargaMembro(userId, filtro).then((c) => { if (ativo && c) setCarga(c) })
    return () => { ativo = false }
  }, [aberto, escopo, porPeriodo, de, ate]) // eslint-disable-line react-hooks/exhaustive-deps

  function confirmar() {
    if (!para) { setErro('Escolha quem vai receber'); return }
    const alvo = destinos.find((d) => d.id === para)
    if (periodoInvertido) { setErro('A data final é anterior à inicial'); return }
    if (!confirm(`Transferir ${carga?.osNoCriterio ?? ''} O.S. de ${nome} para ${alvo?.nome ?? alvo?.email}${escopo === 'todas' ? ' (inclui concluídas e canceladas)' : ''}${porPeriodo ? ' no período escolhido' : ''}?${remover ? ` O acesso de ${nome} será removido.` : ''}`)) return
    setErro(null)
    start(async () => {
      const r = await transferirOs(userId, para, remover, filtro)
      if (!r.ok) { setErro(r.error ?? 'Erro ao transferir'); return }
      setFeito(`${r.osTransferidas} O.S., ${r.planosTransferidos} plano(s) e ${r.eventosTransferidos} evento(s) avulso(s) transferidos para ${r.para ?? 'o técnico escolhido'}.`)
      setCarga({ osPendentes: 0, planosAtivos: 0, eventosAvulsos: 0, osNoCriterio: 0 })
      router.refresh()
    })
  }

  return (
    <div>
      <button onClick={abrir} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
        <ArrowRightLeft size={12} /> Transferir O.S.
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pendente && setAberto(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900">Transferir O.S. de {nome}</h3>
            {carga ? (
              <p className="text-sm text-gray-600">
                Pendentes: <b>{carga.osPendentes}</b> O.S. (abertas, agendadas e em andamento), <b>{carga.planosAtivos}</b> plano(s) preventivo(s) ativo(s)
                {carga.eventosAvulsos ? <> e <b>{carga.eventosAvulsos}</b> evento(s) avulso(s) na agenda</> : null}. 
              </p>
            ) : <p className="text-sm text-gray-400">Carregando…</p>}
            <fieldset className="space-y-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">O que transferir</legend>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="escopo" className="mt-1" checked={escopo === 'pendentes'} onChange={() => setEscopo('pendentes')} />
                <span>Só as pendentes (abertas, agendadas e em andamento), de qualquer data</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="escopo" className="mt-1" checked={escopo === 'todas'} onChange={() => setEscopo('todas')} />
                <span>Todas, inclusive concluídas e canceladas</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
                <input type="checkbox" checked={porPeriodo} onChange={(e) => setPorPeriodo(e.target.checked)} />
                Limitar a um período (pela data da O.S.)
              </label>
              {porPeriodo && (
                <div className="flex items-center gap-2 text-sm">
                  <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="px-2 py-1.5 border border-border rounded-lg" aria-label="De" />
                  <span className="text-gray-400">até</span>
                  <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="px-2 py-1.5 border border-border rounded-lg" aria-label="Até" />
                </div>
              )}
              {porPeriodo && <p className="text-[11px] text-gray-400">Com período, só as O.S. mudam de responsável; planos e eventos avulsos ficam como estão.</p>}
              {periodoInvertido
                ? <p className="text-xs text-destructive">A data final é anterior à inicial.</p>
                : carga?.osNoCriterio != null && <p className="text-xs text-gray-600">Serão transferidas <b>{carga.osNoCriterio}</b> O.S.</p>}
            </fieldset>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passar para</label>
              <select value={para} onChange={(e) => setPara(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                <option value="">Selecione…</option>
                {destinos.filter((d) => d.id !== userId).map((d) => (
                  <option key={d.id} value={d.id}>{d.nome ?? d.email}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={remover} onChange={(e) => setRemover(e.target.checked)} />
              Remover o acesso de {nome} depois (desligamento)
            </label>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            {feito && <p className="text-sm text-green-700">{feito}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAberto(false)} disabled={pendente} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{feito ? 'Fechar' : 'Cancelar'}</button>
              {!feito && (
                <button onClick={confirmar} disabled={pendente || !para} className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg disabled:opacity-50">
                  {pendente ? 'Transferindo…' : 'Transferir'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
