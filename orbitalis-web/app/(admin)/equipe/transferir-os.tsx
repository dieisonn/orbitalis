'use client'

import { useState, useTransition } from 'react'
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
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  const [pendente, start] = useTransition()

  function abrir() {
    setAberto(true); setErro(null); setFeito(null)
    cargaMembro(userId).then(setCarga)
  }

  function confirmar() {
    if (!para) { setErro('Escolha quem vai receber'); return }
    const alvo = destinos.find((d) => d.id === para)
    if (!confirm(`Transferir tudo de ${nome} para ${alvo?.nome ?? alvo?.email}?${remover ? ` O acesso de ${nome} será removido.` : ''}`)) return
    setErro(null)
    start(async () => {
      const r = await transferirOs(userId, para, remover)
      if (!r.ok) { setErro(r.error ?? 'Erro ao transferir'); return }
      setFeito(`${r.osTransferidas} O.S., ${r.planosTransferidos} plano(s) e ${r.eventosTransferidos} evento(s) avulso(s) transferidos para ${r.para ?? 'o técnico escolhido'}.`)
      setCarga({ osPendentes: 0, planosAtivos: 0, eventosAvulsos: 0 })
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
                {carga.eventosAvulsos ? <> e <b>{carga.eventosAvulsos}</b> evento(s) avulso(s) na agenda</> : null}. O que já foi concluído continua no nome de quem executou.
              </p>
            ) : <p className="text-sm text-gray-400">Carregando…</p>}
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
