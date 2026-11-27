import { api } from '@/lib/api'
import { lerPaginacao } from '@/lib/paginacao'
import type { Categoria, Conta, Lancamento, TipoLanc } from '@/lib/financeiro'
import type { Fornecedor } from '@/lib/suprimentos'
import { LancamentosClient } from './lancamentos-client'

export type ParamsLista = { status?: string; q?: string; de?: string; ate?: string; contaId?: string; categoriaId?: string; pagina?: string; limite?: string; ordem?: string; dir?: string }

export async function ListaLancamentos({ tipo, sp }: { tipo: TipoLanc; sp: ParamsLista }) {
  const { status = 'aberto', q = '', de = '', ate = '', contaId = '', categoriaId = '' } = sp
  const { pagina, limite } = lerPaginacao(sp.pagina, sp.limite)
  const qs = new URLSearchParams({ tipo, status, pagina: String(pagina), limite: String(limite) })
  for (const [k, v] of Object.entries({ q, de, ate, contaId, categoriaId, ordem: sp.ordem ?? '', dir: sp.dir ?? '' })) if (v) qs.set(k, v)
  const [resp, contas, categorias, clientes, fornecedores] = await Promise.all([
    api.get<{ itens: Lancamento[]; total: number; somaValor: number }>(`/financeiro/lancamentos?${qs}`).catch(() => ({ itens: [] as Lancamento[], total: 0, somaValor: 0 })),
    api.get<Conta[]>('/financeiro/contas').catch(() => [] as Conta[]),
    api.get<Categoria[]>(`/financeiro/categorias?tipo=${tipo === 'receber' ? 'receita' : 'despesa'}`).catch(() => [] as Categoria[]),
    tipo === 'receber' ? api.get<{ data: { id: string; razaoSocial: string; nomeFantasia: string | null }[] }>('/clientes?perPage=1000').then((r) => r.data).catch(() => []) : Promise.resolve([]),
    tipo === 'pagar' ? api.get<Fornecedor[]>('/fornecedores?ativo=true').catch(() => [] as Fornecedor[]) : Promise.resolve([] as Fornecedor[]),
  ])
  return (
    <LancamentosClient
      tipo={tipo} itens={resp.itens} total={resp.total} somaValor={resp.somaValor} pagina={pagina} limite={limite}
      contas={contas.filter((c) => c.ativa)} categorias={categorias.filter((c) => c.ativa)} clientes={clientes} fornecedores={fornecedores.map((f) => ({ id: f.id, razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia }))}
      filtros={{ status, q, de, ate, contaId, categoriaId }}
    />
  )
}
