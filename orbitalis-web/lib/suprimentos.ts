// Tipos e formatadores de fornecedores, produtos, estoque e catálogo de serviços

export type Fornecedor = {
  id: string; numero: number; tipoPessoa: 'F' | 'J'; razaoSocial: string; nomeFantasia: string | null
  cpfCnpj: string | null; inscricaoEstadual: string | null; inscricaoMunicipal?: string | null; rg?: string | null; dataNascimento?: string | null; email: string | null; telefone: string | null
  celular: string | null; contato: string | null; cep: string | null; logradouro: string | null
  numeroEndereco: string | null; complemento: string | null; bairro: string | null; cidade: string | null
  uf: string | null; observacoes: string | null; ativo: boolean; _count?: { produtos: number }
}

export type Produto = {
  id: string; numero: number; nome: string; descricao: string | null; codigoInterno: string | null
  codigoBarras: string | null; marca: string | null; categoria: string | null; unidade: string
  ncm: string | null; precoCusto: string | number; precoVenda: string | number; controlaEstoque: boolean
  saldo: string | number; estoqueMinimo: string | number; localizacao: string | null
  fornecedorPadraoId: string | null; ativo: boolean
  estoqueMaximo?: string | number; cest?: string | null; origem?: number | null; pesoBruto?: string | number; pesoLiquido?: string | number
  comissaoPercentual?: string | number; despesasAcessorias?: string | number; outrasDespesas?: string | number
  largura?: string | number; altura?: string | number; comprimento?: string | number; codBeneficio?: string | null
  fornecedorPadrao?: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

export type Movimento = {
  id: string; tipo: 'entrada' | 'saida' | 'ajuste'; motivo: string; delta: number; saldoApos: number
  custoUnitario: number | null; documento: string | null; observacao: string | null; criadoEm: string
  produto: { id: string; nome: string; unidade: string; numero: number }
  fornecedor: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

export type ResumoEstoque = {
  totalProdutos: number; valorEmEstoque: number; zerados: number
  abaixoMinimo: { id: string; numero: number; nome: string; unidade: string; saldo: number; estoqueMinimo: number }[]
}

export type ServicoCatalogo = {
  id: string; numero: number; nome: string; descricao: string | null; unidade: string
  valor: string | number; tipoServicoId: string | null; ativo: boolean
  codigo?: string | null; valorCusto?: string | number; comissaoPercentual?: string | number; atividadeServico?: string | null; nbs?: string | null
}

export const UNIDADES = ['un', 'm', 'm²', 'kg', 'g', 'l', 'ml', 'cx', 'pç', 'par', 'jg', 'rolo', 'h', 'diária', 'visita', 'ponto']

export const MOTIVOS: Record<string, string> = {
  compra: 'Compra', saldo_inicial: 'Saldo inicial', devolucao: 'Devolução', uso_os: 'Uso em O.S.',
  uso_orcamento: 'Uso em orçamento', venda: 'Venda', perda: 'Perda / avaria', ajuste_inventario: 'Ajuste de inventário', outro: 'Outro',
}
export const MOTIVOS_POR_TIPO: Record<'entrada' | 'saida' | 'ajuste', string[]> = {
  entrada: ['compra', 'devolucao', 'outro'],
  saida: ['uso_os', 'venda', 'perda', 'outro'],
  ajuste: ['ajuste_inventario'],
}

export const brl = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const qtd = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
export const nomeForn = (f: { razaoSocial: string; nomeFantasia: string | null }) => f.nomeFantasia || f.razaoSocial

export function formatarDocumento(d: string | null | undefined): string {
  const n = (d ?? '').replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return d ?? ''
}

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

export type Resultado = { ok: true } | { ok: false; erro: string }

export type Inventario = {
  id: string; numero: number; titulo: string; status: 'aberto' | 'concluido' | 'cancelado'; contagemCega: boolean
  filtroCategoria: string | null; filtroLocalizacao: string | null; observacoes: string | null
  criadoEm: string; concluidoEm: string | null; totalItens?: number; itensContados?: number
}
export type InventarioItem = {
  id: string; saldoSistema: number; contado: number | null; observacao: string | null; ajusteAplicado: number | null
  produto: { id: string; numero: number; nome: string; unidade: string; codigoInterno: string | null; categoria: string | null; localizacao: string | null; marca: string | null; saldo: number }
}
export type InventarioDetalhe = Inventario & { itens: InventarioItem[] }
