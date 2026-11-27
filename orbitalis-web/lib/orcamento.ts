// Tipos e contas do orçamento (módulo sem 'use client': serve ao servidor e ao navegador)
// As contas espelham as da API (orcamento-totais.ts): total = itens − desconto + frete.

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado'
export const STATUS_ORDEM: StatusOrcamento[] = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado']
export const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Aguardando aprovação', aprovado: 'Aprovado', rejeitado: 'Rejeitado', expirado: 'Expirado',
}
export const STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600', enviado: 'bg-blue-50 text-blue-700',
  aprovado: 'bg-green-50 text-green-700', rejeitado: 'bg-red-50 text-red-600', expirado: 'bg-yellow-50 text-yellow-700',
}
export const FORMAS_PAGAMENTO = ['PIX', 'Boleto', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência']

export type Totais = { subtotal: number; descontoValor: number; frete: number; total: number }
export type ParcelaOrc = { id?: string; numero?: number; vencimento: string; valor: number | string }

const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function calcularTotais(
  itens: { quantidade: number | string; precoUnitario: number | string }[],
  descontoTipo: string = 'valor',
  desconto: number | string = 0,
  frete: number | string = 0,
): Totais {
  const subtotal = centavos(itens.reduce((t, i) => t + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0))
  const d = Math.max(0, Number(desconto) || 0)
  const descontoValor = centavos(Math.min(subtotal, descontoTipo === 'percentual' ? (subtotal * Math.min(d, 100)) / 100 : d))
  const f = Math.max(0, Number(frete) || 0)
  return { subtotal, descontoValor, frete: centavos(f), total: centavos(subtotal - descontoValor + f) }
}

/** N parcelas iguais (centavos que sobram vão na última), a cada `intervaloDias` a partir do 1º vencimento (aaaa-mm-dd). */
export function gerarParcelas(total: number, quantidade: number, primeiroVencimento: string, intervaloDias = 30) {
  const n = Math.max(1, Math.min(60, Math.floor(quantidade) || 1))
  const base = Math.floor((total / n) * 100) / 100
  const inicio = new Date(`${primeiroVencimento}T12:00:00Z`)
  return Array.from({ length: n }, (_, i) => {
    const venc = new Date(inicio.getTime() + i * intervaloDias * 86_400_000)
    return { vencimento: venc.toISOString().slice(0, 10), valor: i === n - 1 ? centavos(total - base * (n - 1)) : base }
  })
}

export const somaParcelas = (p: { valor: number | string }[]) => centavos(p.reduce((t, x) => t + (Number(x.valor) || 0), 0))
export const fmtData = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—')

export type OrcamentoCompleto = {
  id: string; numero: number; status: StatusOrcamento; titulo: string; validadeDias: number
  observacoes: string | null; observacoesInternas: string | null; tokenPublico: string
  criadoEm: string; aprovadoEm: string | null; rejeitadoEm: string | null
  descontoTipo: 'valor' | 'percentual'; desconto: number | string; frete: number | string; formaPagamento: string | null
  clienteId: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string }
  criadoPor: { nome: string | null; email: string } | null
  itens: { id: string; descricao: string; quantidade: number | string; unidade: string; precoUnitario: number | string; categoria: 'servico' | 'peca'; produtoId: string | null; servicoId: string | null }[]
  parcelas: { id: string; numero: number; vencimento: string; valor: number | string }[]
  anexos: { id: string; nome: string; tipo: string; tamanho: number; criadoEm: string }[]
  totais: Totais
  tipoOs: 'preventiva' | 'corretiva'
  ambienteId: string | null; tipoServicoId: string | null; modeloChecklistId: string | null; visitaOrigemId: string | null
  ambiente: { id: string; nome: string } | null
  tipoServico: { id: string; sigla: string; nome: string; corHex: string } | null
  modeloChecklist: { id: string; nome: string } | null
  ordemServico: { id: string; numero: number | null; status: string } | null
  visitaOrigem?: { id: string; numero: number | null; dataConclusao: string | null; tipoServico: { sigla: string } | null } | null
}
