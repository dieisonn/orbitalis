import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { ContratoActions } from './contrato-actions'

type Contrato = {
  id: string; descricao: string; valorMensal: number | null
  vigenciaInicio: string; vigenciaFim: string; numOsIncluidas: number | null
  ativo: boolean; observacoes: string | null; criadoEm: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
}

type Props = { params: Promise<{ id: string }> }

function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function fmtBRL(v: number | null) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ContratoPage({ params }: Props) {
  const { id } = await params
  let contrato: Contrato
  try {
    contrato = await api.get<Contrato>(`/contratos/${id}`)
  } catch {
    notFound()
  }

  const diasRestantes = Math.ceil((new Date(contrato.vigenciaFim).getTime() - Date.now()) / 86_400_000)
  const vencido = diasRestantes < 0
  const urgente = !vencido && diasRestantes <= 30

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a href="/contratos" className="text-gray-500 hover:text-primary transition-colors">← Contratos</a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contrato.descricao}</h1>
              <a href={`/clientes/${contrato.cliente.id}`} className="text-sm text-primary hover:underline">
                {contrato.cliente.nomeFantasia ?? contrato.cliente.razaoSocial}
              </a>
            </div>
          </div>
          <ContratoActions contratoId={id} ativo={contrato.ativo} />
        </div>

        {/* Status banner */}
        {vencido && (
          <div className="flex items-center gap-3 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-semibold">Contrato vencido há {Math.abs(diasRestantes)} dia(s)</p>
          </div>
        )}
        {urgente && !vencido && (
          <div className="flex items-center gap-3 mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-700 font-semibold">Contrato vence em {diasRestantes} dia(s) — renove em breve</p>
          </div>
        )}
        {!vencido && !urgente && contrato.ativo && (
          <div className="flex items-center gap-3 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-green-500 shrink-0" />
            <p className="text-sm text-green-700 font-semibold">Contrato ativo — {diasRestantes} dias restantes</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Início', value: fmtDate(contrato.vigenciaInicio) },
            { label: 'Vencimento', value: fmtDate(contrato.vigenciaFim) },
            { label: 'Valor Mensal', value: fmtBRL(contrato.valorMensal) },
            { label: 'O.S. inclusas/mês', value: contrato.numOsIncluidas != null ? String(contrato.numOsIncluidas) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {contrato.observacoes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400 mb-1">Observações</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contrato.observacoes}</p>
          </div>
        )}

        <p className="text-xs text-gray-300 mt-5">Criado em {fmtDate(contrato.criadoEm)}</p>
      </div>
    </div>
  )
}
