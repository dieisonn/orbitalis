// Tipos e utilidades do Financeiro (módulo sem 'use client': serve ao servidor e ao navegador)

export type SituacaoLanc = 'aberto' | 'atrasado' | 'pago' | 'cancelado'
export type TipoLanc = 'receber' | 'pagar'

export type Lancamento = {
  id: string; numero: number; tipo: TipoLanc; descricao: string; valor: number; vencimento: string
  status: 'aberto' | 'pago' | 'cancelado'; situacao: SituacaoLanc; pagoEm: string | null; valorPago: number | null
  documento: string | null; observacoes: string | null; grupoId: string | null; parcela: number | null; totalParcelas: number | null
  conta: { id: string; nome: string } | null; categoria: { id: string; nome: string } | null
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  fornecedor: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  orcamento: { id: string; numero: number; titulo: string } | null
}

export type Conta = { id: string; nome: string; tipo: string; saldoInicial: number; saldoAtual: number; ativa: boolean }
export type Categoria = { id: string; nome: string; tipo: 'receita' | 'despesa'; ativa: boolean }
export type Soma = { total: number; qtd: number }
export type AFaturar = { id: string; numero: number; titulo: string; cliente: string; aprovadoEm: string | null; parcelas: number; total: number }

export type Resumo = {
  receberAberto: Soma; receberAtrasado: Soma; pagarAberto: Soma; pagarAtrasado: Soma
  venceHojeReceber: Soma; venceHojePagar: Soma; recebidoMes: Soma; pagoMes: Soma
  saldoContas: number; contas: Conta[]; aFaturar: AFaturar[]
}

export type PeriodoFluxo = {
  periodo: string; entradasRealizadas: number; saidasRealizadas: number; entradasPrevistas: number; saidasPrevistas: number; saldoProjetado: number
}
export type Fluxo = {
  de: string; ate: string; agrupar: 'dia' | 'mes'; saldoInicial: number; atrasadosEntradas: number; atrasadosSaidas: number
  periodos: PeriodoFluxo[]
  totais: { entradasRealizadas: number; saidasRealizadas: number; entradasPrevistas: number; saidasPrevistas: number; saldoFinal: number }
}

export const SITUACAO_LABEL: Record<string, string> = { aberto: 'Em aberto', atrasado: 'Atrasado', pago: 'Pago', cancelado: 'Cancelado' }
export const SITUACAO_COR: Record<string, string> = {
  aberto: 'bg-blue-50 text-blue-700', atrasado: 'bg-red-50 text-red-700', pago: 'bg-green-50 text-green-700', cancelado: 'bg-gray-100 text-gray-500',
}
export const TIPO_CONTA_LABEL: Record<string, string> = { caixa: 'Caixa', banco: 'Conta bancária', carteira: 'Carteira digital' }

export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** 'aaaa-mm-dd' → 'dd/mm/aaaa' (sem fuso: é data civil) */
export const dataBr = (d: string | null | undefined) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—')

export const hojeIso = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
export const somaDiasIso = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)

export const nomePessoa = (p: { razaoSocial: string; nomeFantasia: string | null } | null | undefined) => (p ? (p.nomeFantasia || p.razaoSocial) : '—')

/** Períodos prontos da visão geral */
export function periodoFluxo(chave: string): { de: string; ate: string; agrupar: 'dia' | 'mes'; rotulo: string } {
  const hoje = hojeIso()
  const [a, m] = hoje.split('-').map(Number)
  const fimMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10)
  switch (chave) {
    case 'mes': return { de: `${hoje.slice(0, 8)}01`, ate: fimMes(a, m), agrupar: 'dia', rotulo: 'Este mês' }
    case '60': return { de: hoje, ate: somaDiasIso(hoje, 59), agrupar: 'dia', rotulo: 'Próximos 60 dias' }
    case '90': return { de: hoje, ate: somaDiasIso(hoje, 89), agrupar: 'dia', rotulo: 'Próximos 90 dias' }
    case 'ano': return { de: `${a}-01-01`, ate: `${a}-12-31`, agrupar: 'mes', rotulo: `Ano de ${a}` }
    case '6m': return { de: `${hoje.slice(0, 8)}01`, ate: fimMes(m + 5 > 12 ? a + 1 : a, ((m + 4) % 12) + 1), agrupar: 'mes', rotulo: 'Próximos 6 meses' }
    default: return { de: hoje, ate: somaDiasIso(hoje, 29), agrupar: 'dia', rotulo: 'Próximos 30 dias' }
  }
}
export const PERIODOS_FLUXO = [['30', 'Próximos 30 dias'], ['mes', 'Este mês'], ['60', '60 dias'], ['90', '90 dias'], ['6m', '6 meses'], ['ano', 'Ano']] as const
