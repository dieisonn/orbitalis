import Link from 'next/link'
import { AlertTriangle, ArrowDown, ArrowUp, Boxes, PackageX, Wallet, SlidersHorizontal } from 'lucide-react'
import { api } from '@/lib/api'
import { ThOrdenavel } from '@/components/ui/th-ordenavel'
import { lerOrdem, ordenarLista, type Ordem } from '@/lib/ordenacao'
import { brl, dataHora, MOTIVOS, nomeForn, qtd, type Movimento, type Produto, type ResumoEstoque } from '@/lib/suprimentos'

const sel = 'px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40'

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ produtoId?: string; tipo?: string; de?: string; ate?: string; ordem?: string; dir?: string }> }) {
  const sp = await searchParams
  const { produtoId = '', tipo = '', de = '', ate = '' } = sp
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries({ produtoId, tipo, de, ate })) if (v) qs.set(k, v)
  const [resumo, movimentos, produtos] = await Promise.all([
    api.get<ResumoEstoque>('/produtos/estoque/resumo').catch(() => null),
    api.get<Movimento[]>(`/produtos/movimentos?${qs}`).catch(() => [] as Movimento[]),
    api.get<Produto[]>('/produtos?ativo=true').catch(() => [] as Produto[]),
  ])
  const PADRAO: Ordem = { ordem: 'data', dir: 'desc' }
  const CAMPOS = {
    data: (m: Movimento) => new Date(m.criadoEm),
    produto: (m: Movimento) => m.produto.nome,
    movimento: (m: Movimento) => MOTIVOS[m.motivo] ?? m.motivo,
    quantidade: (m: Movimento) => m.delta,
    saldo: (m: Movimento) => m.saldoApos,
    origem: (m: Movimento) => [m.fornecedor ? nomeForn(m.fornecedor) : '', m.documento ?? '', m.observacao ?? ''].join(' ').trim(),
  }
  const ordem = lerOrdem(sp, Object.keys(CAMPOS), PADRAO)
  const movimentosOrdenados = ordenarLista(movimentos, ordem, CAMPOS)
  const cards = [
    { icone: Boxes, rotulo: 'Produtos com controle', valor: String(resumo?.totalProdutos ?? 0) },
    { icone: Wallet, rotulo: 'Valor em estoque (custo)', valor: brl(resumo?.valorEmEstoque ?? 0) },
    { icone: AlertTriangle, rotulo: 'Abaixo do mínimo', valor: String(resumo?.abaixoMinimo.length ?? 0), alerta: (resumo?.abaixoMinimo.length ?? 0) > 0 },
    { icone: PackageX, rotulo: 'Zerados', valor: String(resumo?.zerados ?? 0), alerta: (resumo?.zerados ?? 0) > 0 },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Estoque</h1>
          <p className="text-gray-500 text-sm mt-1">Saldo, alertas de reposição e histórico de entradas, saídas e ajustes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/estoque/inventarios" className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-border rounded-lg hover:bg-surface">Inventário (conferência)</Link>
          <Link href="/produtos" className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90">Ir para produtos e movimentar</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.rotulo} className="bg-white rounded-xl border border-border p-4">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${c.alerta ? 'text-amber-700' : 'text-gray-500'}`}>
              <c.icone size={14} aria-hidden="true" /> {c.rotulo}
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{c.valor}</p>
          </div>
        ))}
      </div>

      {resumo && resumo.abaixoMinimo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" /> Repor estoque</h2>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-amber-900">
            {resumo.abaixoMinimo.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <Link href={`/estoque?produtoId=${p.id}`} className="hover:underline truncate">{p.nome}</Link>
                <span className="shrink-0 font-semibold">{qtd(p.saldo)} / mín. {qtd(p.estoqueMinimo)} {p.unidade}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <form method="get" className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-border">
          <label className="flex flex-col text-xs font-medium text-gray-600">Produto
            <select name="produtoId" defaultValue={produtoId} className={`${sel} block mt-1 max-w-[16rem]`}>
              <option value="">Todos</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-600">Tipo
            <select name="tipo" defaultValue={tipo} className={`${sel} block mt-1`}>
              <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="ajuste">Ajustes</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-600">De<input type="date" name="de" defaultValue={de} className={`${sel} block mt-1`} /></label>
          <label className="flex flex-col text-xs font-medium text-gray-600">Até<input type="date" name="ate" defaultValue={ate} className={`${sel} block mt-1`} /></label>
          <button className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Filtrar</button>
          {(produtoId || tipo || de || ate) && <Link href="/estoque" className="px-2 py-2 text-sm text-gray-600 underline">Limpar</Link>}
        </form>

        {movimentos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">Nenhuma movimentação no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <ThOrdenavel campo="data" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Data</ThOrdenavel>
                  <ThOrdenavel campo="produto" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Produto</ThOrdenavel>
                  <ThOrdenavel campo="movimento" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Movimento</ThOrdenavel>
                  <ThOrdenavel campo="quantidade" atual={ordem} padrao={PADRAO} className="text-right px-4 py-3">Quantidade</ThOrdenavel>
                  <ThOrdenavel campo="saldo" atual={ordem} padrao={PADRAO} className="text-right px-4 py-3">Saldo</ThOrdenavel>
                  <ThOrdenavel campo="origem" atual={ordem} padrao={PADRAO} className="hidden md:table-cell text-left px-4 py-3">Origem</ThOrdenavel>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimentosOrdenados.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{dataHora(m.criadoEm)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.produto.nome}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        {m.tipo === 'entrada' ? <ArrowUp size={13} className="text-green-700" aria-hidden="true" /> : m.tipo === 'saida' ? <ArrowDown size={13} className="text-red-700" aria-hidden="true" /> : <SlidersHorizontal size={13} className="text-gray-500" aria-hidden="true" />}
                        {MOTIVOS[m.motivo] ?? m.motivo}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.delta > 0 ? 'text-green-700' : m.delta < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                      {m.delta > 0 ? '+' : ''}{qtd(m.delta)} {m.produto.unidade}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{qtd(m.saldoApos)}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-600">
                      {[m.fornecedor ? nomeForn(m.fornecedor) : null, m.documento ? `NF ${m.documento}` : null, m.custoUnitario != null ? `custo ${brl(m.custoUnitario)}` : null, m.observacao].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
