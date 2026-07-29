'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

type OrcItem = { id: string; descricao: string; quantidade: number; unidade: string; precoUnitario: number }
type Orc = {
  id: string; numero: number; status: string; titulo: string; validadeDias: number; observacoes: string | null; criadoEm: string
  cliente: { razaoSocial: string; nomeFantasia: string | null }
  itens: OrcItem[]
}

function fmtBRL(v: number) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export function AprovarOrcamento({ orc, token }: { orc: Orc; token: string }) {
  const [status, setStatus] = useState(orc.status)
  const [loading, setLoading] = useState<'aprovar' | 'rejeitar' | null>(null)

  const total = orc.itens.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.precoUnitario), 0)
  const validade = new Date(new Date(orc.criadoEm).getTime() + orc.validadeDias * 86400000)

  async function acao(tipo: 'aprovar' | 'rejeitar') {
    setLoading(tipo)
    try {
      const res = await fetch(`/api/orcamentos/publico/${token}/${tipo}`, { method: 'POST' })
      if (res.ok) setStatus(tipo === 'aprovar' ? 'aprovado' : 'rejeitado')
    } finally {
      setLoading(null)
    }
  }

  if (status === 'aprovado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta aprovada!</h1>
          <p className="text-gray-500 text-sm">Obrigado. Em breve nossa equipe entrará em contato para agendar os serviços.</p>
        </div>
      </div>
    )
  }

  if (status === 'rejeitado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta recusada</h1>
          <p className="text-gray-500 text-sm">Registramos sua resposta. Entre em contato conosco se desejar discutir outras opções.</p>
        </div>
      </div>
    )
  }

  if (status !== 'enviado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Esta proposta não está disponível para resposta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <p className="text-xs font-mono text-gray-400 mb-1">ORC-{String(orc.numero).padStart(4, '0')}</p>
          <h1 className="text-xl font-bold text-gray-900">{orc.titulo}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orc.cliente.nomeFantasia ?? orc.cliente.razaoSocial} ·
            Válida até {validade.toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Serviço / Produto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Qtd</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orc.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-gray-800">{item.descricao}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{item.quantidade} {item.unidade}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {fmtBRL(Number(item.quantidade) * Number(item.precoUnitario))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={2} className="px-5 py-4 text-right font-bold text-gray-700">Total</td>
                <td className="px-5 py-4 text-right text-xl font-bold text-gray-900">{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Observações */}
        {orc.observacoes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Observações</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{orc.observacoes}</p>
          </div>
        )}

        {/* Ações */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => acao('aprovar')} disabled={loading !== null}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading === 'aprovar' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Aprovar proposta
          </button>
          <button
            onClick={() => acao('rejeitar')} disabled={loading !== null}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
          >
            {loading === 'rejeitar' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Recusar proposta
          </button>
        </div>
      </div>
    </div>
  )
}
