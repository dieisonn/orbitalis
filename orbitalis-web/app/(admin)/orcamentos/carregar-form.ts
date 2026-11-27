import { api } from '@/lib/api'
import type { ModeloResumo } from '@/lib/checklist'
import type { Produto, ServicoCatalogo } from '@/lib/suprimentos'
import type { ProdutoOpt, ServicoOpt } from './orcamento-form'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; clienteId: string }
type VisitaRecente = { id: string; clienteId: string; numero: number | null; sigla: string; dataConclusao: string | null }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string; ativo: boolean }

/** Dados de apoio do formulário de orçamento (novo e edição). */
export async function carregarApoioForm() {
  const [clientesRes, ambientesRes, tiposServico, modelosRes, visitas, produtos, servicos] = await Promise.all([
    api.get<{ data: Cliente[] }>('/clientes?perPage=1000').catch(() => ({ data: [] as Cliente[] })),
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[]),
    api.get<{ data: ModeloResumo[] }>('/modelos-checklist?perPage=500').catch(() => ({ data: [] as ModeloResumo[] })),
    api.get<VisitaRecente[]>('/orcamentos/visitas-recentes').catch(() => [] as VisitaRecente[]),
    api.get<Produto[]>('/produtos?ativo=true').catch(() => [] as Produto[]),
    api.get<ServicoCatalogo[]>('/catalogo-servicos?ativo=true').catch(() => [] as ServicoCatalogo[]),
  ])
  const produtosOpt: ProdutoOpt[] = produtos.map((p) => ({
    id: p.id, nome: p.nome, codigo: p.codigoInterno, unidade: p.unidade, preco: Number(p.precoVenda) || 0,
    controlaEstoque: p.controlaEstoque, saldo: Number(p.saldo) || 0,
  }))
  const servicosOpt: ServicoOpt[] = servicos.map((s) => ({ id: s.id, nome: s.nome, codigo: s.codigo ?? null, unidade: s.unidade, preco: Number(s.valor) || 0 }))
  return {
    clientes: clientesRes.data, ambientes: ambientesRes.data, tiposServico: tiposServico.filter((t) => t.ativo),
    modelos: modelosRes.data, visitas, produtos: produtosOpt, servicos: servicosOpt,
  }
}
