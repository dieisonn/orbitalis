'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { gerarReceberDoOrcamento } from '../../financeiro/actions'
import { brl, dataBr, SITUACAO_LABEL, SITUACAO_COR } from '@/lib/financeiro'

type L = { id: string; numero: number; descricao: string; valor: number | string; vencimento: string; status: string; atrasado?: boolean; parcela?: number | null; totalParcelas?: number | null }

export function ReceberPanel({ orcamentoId, lancamentos }: { orcamentoId: string; lancamentos: L[] }) {
  const [pend, start] = useTransition()
  const [erro, setErro] = useState('')
  const gerar = () => start(async () => { const r = await gerarReceberDoOrcamento(orcamentoId); setErro(r.ok ? '' : r.erro ?? 'Erro') })
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Contas a receber</h2>
        {lancamentos.length === 0 && (
          <button onClick={gerar} disabled={pend} className="text-sm px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50">
            {pend ? 'Gerando…' : 'Gerar contas a receber'}
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {lancamentos.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma conta a receber gerada para este orçamento.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {lancamentos.map((l) => {
            const sit = l.status === 'aberto' && l.atrasado ? 'atrasado' : l.status
            return (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <span>{l.parcela && l.totalParcelas && l.totalParcelas > 1 ? `Parcela ${l.parcela}/${l.totalParcelas}` : l.descricao} · vence {dataBr(l.vencimento)}</span>
                <span className="flex items-center gap-2">
                  <strong>{brl(Number(l.valor))}</strong>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${SITUACAO_COR[sit] ?? ''}`}>{SITUACAO_LABEL[sit] ?? sit}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <Link href="/financeiro/receber" className="text-xs text-primary hover:underline">Abrir no Financeiro</Link>
    </div>
  )
}
