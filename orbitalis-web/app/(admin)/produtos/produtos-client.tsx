'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, Loader2, ArrowDownUp, History, Percent, Tags, Printer, X } from 'lucide-react'
import { Paginacao } from '@/components/ui/paginacao'
import { ThOrdenavel, useOrdemUrl } from '@/components/ui/th-ordenavel'
import type { Ordem } from '@/lib/ordenacao'
import { PlanilhaBotoes } from '@/components/ui/planilha-botoes'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { brl, qtd, nomeForn, UNIDADES, MOTIVOS, MOTIVOS_POR_TIPO, type Fornecedor, type Produto } from '@/lib/suprimentos'
import { hojeIso } from '@/lib/financeiro'
import { excluirProduto, alternarProduto, movimentarProduto, executarLote, type DadosMovimento, type RegraMarkup, type AcaoLote, type SelecaoProdutos } from './actions'

type Filtros = { q: string; situacao: string; categoria: string; ativo: string }

const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')))

function SaldoBadge({ p }: { p: Produto }) {
  if (!p.controlaEstoque) return <span className="text-xs text-gray-400">sem controle</span>
  const s = Number(p.saldo), min = Number(p.estoqueMinimo)
  const cls = s <= 0 ? 'bg-red-50 text-red-700 border-red-200' : min > 0 && s <= min ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>{qtd(s)} {p.unidade}</span>
}

const CAMPOS_ORDEM = ['nome', 'categoria', 'custo', 'venda', 'estoque']
const PADRAO_ORDEM: Ordem = { ordem: 'nome', dir: 'asc' }

export function ProdutosClient({ produtos, total, pagina, limite, markup, categorias, fornecedores, filtros }: { produtos: Produto[]; total: number; pagina: number; limite: number; markup: RegraMarkup; categorias: string[]; fornecedores: Fornecedor[]; filtros: Filtros }) {
  const router = useRouter()
  const ordem = useOrdemUrl(CAMPOS_ORDEM, PADRAO_ORDEM)
  const spAtual = useSearchParams()
  const [pendente, iniciar] = useTransition()
  const [busca, setBusca] = useState(filtros.q)
  const [erro, setErro] = useState<string | null>(null)
  const [mov, setMov] = useState<Produto | null>(null)
  const [aPrazo, setAPrazo] = useState<{ ativo: boolean; vencimento: string; parcelas: string }>({ ativo: false, vencimento: hojeIso(), parcelas: '1' })
  const [movForm, setMovForm] = useState<DadosMovimento & { qStr: string; custoStr: string }>({ tipo: 'entrada', quantidade: 0, motivo: 'compra', qStr: '', custoStr: '' })

  // ---- seleção e ações em lote
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [todosFiltro, setTodosFiltro] = useState(false)
  const [lote, setLote] = useState<null | { acao: AcaoLote | 'etiquetas' }>(null)
  const [loteForm, setLoteForm] = useState({ percentual: '', categoria: '' })
  const [aviso, setAviso] = useState<string | null>(null)
  const idsPagina = produtos.map((p) => p.id)
  const todosDaPagina = idsPagina.length > 0 && idsPagina.every((id) => marcados.has(id))
  const qtdSel = todosFiltro ? total : marcados.size
  const selecao = (): SelecaoProdutos => (todosFiltro ? { filtro: { q: filtros.q, categoria: filtros.categoria, ativo: filtros.ativo, situacao: filtros.situacao } } : { ids: Array.from(marcados) })
  const alternarTodos = () => { setTodosFiltro(false); setMarcados(todosDaPagina ? new Set() : new Set(idsPagina)) }
  const alternar = (id: string) => { setTodosFiltro(false); setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  const limparSel = () => { setMarcados(new Set()); setTodosFiltro(false) }

  function abrirLote(acao: AcaoLote | 'etiquetas') {
    setErro(null); setLoteForm({ percentual: '', categoria: '' })
    if (acao === 'etiquetas') {
      try { sessionStorage.setItem('orbitalis_etiquetas_sel', JSON.stringify(selecao())) } catch { /* segue sem armazenar */ }
      router.push('/produtos/etiquetas'); return
    }
    if (acao === 'ativar' || acao === 'inativar') { confirmarLote(acao); return }
    setLote({ acao })
  }
  function confirmarLote(acao: AcaoLote) {
    const pct = loteForm.percentual.trim() === '' ? undefined : Number(loteForm.percentual.replace(',', '.'))
    if (acao === 'ajuste_preco' && (pct === undefined || Number.isNaN(pct) || pct === 0)) { setErro('Informe o percentual (use sinal negativo para reduzir)'); return }
    if (acao === 'markup' && pct !== undefined && (Number.isNaN(pct) || pct < 0)) { setErro('Markup inválido'); return }
    setErro(null)
    iniciar(async () => {
      const r = await executarLote(selecao(), acao, { percentual: pct, categoria_nova: acao === 'categoria' ? loteForm.categoria : undefined })
      if (!r.ok) { setErro(r.erro); return }
      setLote(null); limparSel()
      const rot: Record<AcaoLote, string> = { markup: 'preços recalculados', ajuste_preco: 'preços ajustados', ativar: 'ativados', inativar: 'inativados', categoria: 'grupo alterado', excluir: 'excluídos' }
      setAviso(`${r.afetados} produto(s): ${rot[acao]}.${r.ignorados ? ` ${r.ignorados} ignorado(s)${r.motivoIgnorados ? ` (${r.motivoIgnorados})` : ''}.` : ''}`)
      router.refresh()
    })
  }

  function filtrar(patch: Partial<Filtros>) {
    const f = { ...filtros, q: busca.trim(), ...patch }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
    for (const k of ['ordem', 'dir']) { const v = spAtual.get(k); if (v) p.set(k, v) }
    router.push(`/produtos${p.size ? `?${p}` : ''}`)
  }

  function excluir(p: Produto) {
    if (!confirm(`Excluir o produto "${p.nome}"? O histórico de estoque continua guardado.`)) return
    iniciar(async () => { const r = await excluirProduto(p.id); if (r.ok) router.refresh(); else alert(r.erro) })
  }

  function abrirMov(p: Produto, tipo: 'entrada' | 'saida' | 'ajuste' = 'entrada') {
    setMov(p); setErro(null)
    setMovForm({ tipo, quantidade: 0, motivo: MOTIVOS_POR_TIPO[tipo][0], qStr: tipo === 'ajuste' ? String(Number(p.saldo)) : '', custoStr: tipo === 'entrada' ? String(Number(p.precoCusto) || '') : '', fornecedorId: p.fornecedorPadraoId ?? '', documento: '', observacao: '' })
  }
  const trocarTipo = (tipo: 'entrada' | 'saida' | 'ajuste') =>
    setMovForm((m) => ({ ...m, tipo, motivo: MOTIVOS_POR_TIPO[tipo][0], qStr: tipo === 'ajuste' && mov ? String(Number(mov.saldo)) : '' }))

  function registrar() {
    if (!mov) return
    const quantidade = num(movForm.qStr)
    if (movForm.qStr === '' || !(quantidade >= 0) || (movForm.tipo !== 'ajuste' && quantidade <= 0)) { setErro('Informe uma quantidade válida'); return }
    setErro(null)
    iniciar(async () => {
      const r = await movimentarProduto(mov.id, {
        tipo: movForm.tipo, quantidade, motivo: movForm.motivo,
        custoUnitario: movForm.tipo === 'entrada' && movForm.custoStr !== '' ? num(movForm.custoStr) : undefined,
        fornecedorId: movForm.tipo === 'entrada' ? movForm.fornecedorId : undefined,
        documento: movForm.documento, observacao: movForm.observacao,
        contaPagar: movForm.tipo === 'entrada' && movForm.motivo === 'compra' && aPrazo.ativo ? { vencimento: aPrazo.vencimento, parcelas: Math.max(1, parseInt(aPrazo.parcelas) || 1) } : undefined,
      })
      if (r.ok) { setMov(null); router.refresh() } else setErro(r.erro)
    })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <form onSubmit={(e) => { e.preventDefault(); filtrar({}) }} className="relative flex-1 min-w-[12rem] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código, marca…" className={`${inputCls} pl-9`} aria-label="Buscar produtos" />
          </form>
          <select value={filtros.situacao} onChange={(e) => filtrar({ situacao: e.target.value })} className={`${inputCls} !w-auto`} aria-label="Situação do estoque">
            <option value="">Todo o estoque</option><option value="abaixo_minimo">Abaixo do mínimo</option><option value="zerado">Zerados</option>
          </select>
          {categorias.length > 0 && (
            <select value={filtros.categoria} onChange={(e) => filtrar({ categoria: e.target.value })} className={`${inputCls} !w-auto`} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={filtros.ativo} onChange={(e) => filtrar({ ativo: e.target.value })} className={`${inputCls} !w-auto`} aria-label="Cadastro">
            <option value="">Ativos e inativos</option><option value="true">Ativos</option><option value="false">Inativos</option>
          </select>
          <Link href="/estoque" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface"><History size={14} /> Movimentações</Link>
          <Link href="/produtos/markup" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface"><Percent size={14} /> Markup padrão</Link>
          <PlanilhaBotoes recurso="produtos" nome="produtos" estoque />
          <Link href="/produtos/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo produto
          </Link>
        </div>

        {aviso && (
          <div role="status" className="flex items-center justify-between gap-3 px-4 py-2 bg-green-50 border-b border-green-200 text-sm text-green-800">
            <span>{aviso}</span><button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso"><X size={14} /></button>
          </div>
        )}
        {qtdSel > 0 && (
          <div className="px-4 py-3 bg-primary/5 border-b border-border space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary">{qtdSel} selecionado(s)</span>
              <button type="button" onClick={() => abrirLote('markup')} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface"><Percent size={13} /> Aplicar markup padrão</button>
              <button type="button" onClick={() => abrirLote('ajuste_preco')} className="px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface">Ajustar preço (%)</button>
              <button type="button" onClick={() => abrirLote('categoria')} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface"><Tags size={13} /> Alterar grupo</button>
              <button type="button" onClick={() => abrirLote('etiquetas')} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface"><Printer size={13} /> Etiquetas</button>
              <button type="button" onClick={() => abrirLote('ativar')} disabled={pendente} className="px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface">Ativar</button>
              <button type="button" onClick={() => abrirLote('inativar')} disabled={pendente} className="px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-surface">Inativar</button>
              <button type="button" onClick={() => abrirLote('excluir')} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-destructive bg-white border border-destructive/30 rounded-lg hover:bg-red-50"><Trash2 size={13} /> Excluir</button>
              <button type="button" onClick={limparSel} className="ml-auto text-xs text-gray-600 hover:underline">Limpar seleção</button>
            </div>
            {!todosFiltro && todosDaPagina && total > produtos.length && (
              <p className="text-xs text-gray-700">Os {produtos.length} desta página estão marcados. <button type="button" onClick={() => setTodosFiltro(true)} className="font-semibold text-primary hover:underline">Selecionar todos os {total} resultados</button></p>
            )}
            {todosFiltro && <p className="text-xs text-gray-700">Todos os {total} resultados da busca estão selecionados.</p>}
            {erro && !lote && <p role="alert" className="text-xs text-destructive">{erro}</p>}
          </div>
        )}

        {produtos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{Object.values(filtros).some(Boolean) ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="w-10 px-4 py-3"><input type="checkbox" checked={todosDaPagina || todosFiltro} onChange={alternarTodos} aria-label="Selecionar todos desta página" className="h-4 w-4 accent-[var(--color-action)]" /></th>
                  <ThOrdenavel campo="nome" atual={ordem} padrao={PADRAO_ORDEM} className="text-left px-4 py-3">Produto</ThOrdenavel>
                  <ThOrdenavel campo="categoria" atual={ordem} padrao={PADRAO_ORDEM} className="hidden md:table-cell text-left px-4 py-3">Categoria</ThOrdenavel>
                  <ThOrdenavel campo="custo" atual={ordem} padrao={PADRAO_ORDEM} className="hidden sm:table-cell text-right px-4 py-3">Custo</ThOrdenavel>
                  <ThOrdenavel campo="venda" atual={ordem} padrao={PADRAO_ORDEM} className="hidden sm:table-cell text-right px-4 py-3">Venda</ThOrdenavel>
                  <ThOrdenavel campo="estoque" atual={ordem} padrao={PADRAO_ORDEM} className="text-right px-4 py-3">Estoque</ThOrdenavel>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {produtos.map((p) => (
                  <tr key={p.id} className={`${p.ativo ? '' : 'opacity-60'} ${marcados.has(p.id) || todosFiltro ? 'bg-primary/5' : ''}`}>
                    <td className="w-10 px-4 py-3"><input type="checkbox" checked={marcados.has(p.id) || todosFiltro} onChange={() => alternar(p.id)} aria-label={`Selecionar ${p.nome}`} className="h-4 w-4 accent-[var(--color-action)]" /></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.nome}{!p.ativo && <span className="ml-2 text-xs text-gray-500">(inativo)</span>}</p>
                      <p className="text-xs text-gray-500">
                        #{p.numero}{p.codigoInterno ? ` · ${p.codigoInterno}` : ''}{p.marca ? ` · ${p.marca}` : ''}
                        {p.fornecedorPadrao ? ` · ${nomeForn(p.fornecedorPadrao)}` : ''}
                      </p>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-700">{p.categoria || '—'}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-gray-700">{brl(p.precoCusto)}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-gray-700">{brl(p.precoVenda)}</td>
                    <td className="px-4 py-3 text-right"><SaldoBadge p={p} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {p.controlaEstoque && (
                          <button onClick={() => abrirMov(p)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5">
                            <ArrowDownUp size={12} /> Movimentar
                          </button>
                        )}
                        <button onClick={() => iniciar(async () => { const r = await alternarProduto(p.id, !p.ativo); if (r.ok) router.refresh(); else alert(r.erro) })}
                          className="hidden lg:inline px-2 py-1 text-xs font-semibold text-gray-600 border border-border rounded-lg hover:bg-surface">{p.ativo ? 'Inativar' : 'Ativar'}</button>
                        <Link href={`/produtos/${p.id}`} aria-label={`Editar ${p.nome}`} className="p-2 text-gray-500 hover:text-primary"><Pencil size={14} /></Link>
                        <button onClick={() => excluir(p)} aria-label={`Excluir ${p.nome}`} className="p-2 text-gray-500 hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao total={total} pagina={pagina} limite={limite} />
      </div>

      {lote && (
        <Modal
          titulo={{ markup: 'Aplicar markup padrão', ajuste_preco: 'Ajustar preço de venda', categoria: 'Alterar grupo', excluir: 'Excluir produtos' }[lote.acao as 'markup' | 'ajuste_preco' | 'categoria' | 'excluir']}
          onFechar={() => setLote(null)} largura="max-w-md">
          <div className="space-y-3 text-sm">
            <p className="text-gray-700">Vale para <strong>{qtdSel}</strong> produto(s) selecionado(s).</p>
            {lote.acao === 'markup' && (
              <>
                <p className="text-gray-600">O preço de venda de cada produto vira <em>custo final × (1 + markup)</em>. Markup padrão: <strong>{markup.padrao}%</strong>
                  {markup.categorias.length > 0 && <> · por grupo: {markup.categorias.map((c) => `${c.categoria} ${c.percentual}%`).join(', ')}</>}.
                  {markup.padrao <= 0 && markup.categorias.length === 0 && <span className="text-amber-700"> Nenhum markup configurado ainda — defina em “Markup padrão” ou informe um valor abaixo.</span>}
                </p>
                <Campo rotulo="Usar outro markup só desta vez (%)" dica="Deixe vazio para seguir as regras acima."><input value={loteForm.percentual} onChange={(e) => setLoteForm({ ...loteForm, percentual: e.target.value })} className={inputCls} inputMode="decimal" /></Campo>
                <p className="text-xs text-gray-500">Produtos sem custo informado são ignorados.</p>
              </>
            )}
            {lote.acao === 'ajuste_preco' && (
              <Campo rotulo="Percentual (%)" dica="Ex.: 10 aumenta 10%; -5 reduz 5%."><input value={loteForm.percentual} onChange={(e) => setLoteForm({ ...loteForm, percentual: e.target.value })} className={inputCls} inputMode="decimal" autoFocus /></Campo>
            )}
            {lote.acao === 'categoria' && (
              <Campo rotulo="Novo grupo" dica="Deixe vazio para remover o grupo.">
                <input value={loteForm.categoria} onChange={(e) => setLoteForm({ ...loteForm, categoria: e.target.value })} list="categorias-lote" className={inputCls} autoFocus />
                <datalist id="categorias-lote">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>
            )}
            {lote.acao === 'excluir' && <p className="text-destructive">Os produtos saem das listas e dos orçamentos novos. O histórico de estoque é mantido. Esta ação não pode ser desfeita pela tela.</p>}
            {erro && <p role="alert" className="text-destructive">{erro}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setLote(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
              <button onClick={() => confirmarLote(lote.acao as AcaoLote)} disabled={pendente}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 ${lote.acao === 'excluir' ? 'bg-destructive hover:bg-destructive/90' : 'bg-action hover:bg-action/90'}`}>
                {pendente && <Loader2 size={14} className="animate-spin" />} {lote.acao === 'excluir' ? `Excluir ${qtdSel}` : 'Aplicar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mov && (
        <Modal titulo={`Movimentar — ${mov.nome}`} onFechar={() => setMov(null)} largura="max-w-md">
          <p className="text-sm text-gray-700 mb-3">Saldo atual: <b>{qtd(mov.saldo)} {mov.unidade}</b></p>
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Tipo de movimentação">
            {(['entrada', 'saida', 'ajuste'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={movForm.tipo === t} onClick={() => trocarTipo(t)}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border ${movForm.tipo === t ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border hover:bg-surface'}`}>
                {t === 'entrada' ? 'Entrada' : t === 'saida' ? 'Saída' : 'Ajuste (contagem)'}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <Campo rotulo={movForm.tipo === 'ajuste' ? `Saldo contado (${mov.unidade})` : `Quantidade (${mov.unidade})`} dica={movForm.tipo === 'ajuste' ? 'Informe quanto existe de fato; o sistema calcula a diferença.' : undefined}>
              <input type="number" min="0" step="0.001" value={movForm.qStr} onChange={(e) => setMovForm({ ...movForm, qStr: e.target.value })} className={inputCls} autoFocus />
            </Campo>
            {movForm.tipo !== 'ajuste' && (
              <Campo rotulo="Motivo">
                <select value={movForm.motivo} onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })} className={inputCls}>
                  {MOTIVOS_POR_TIPO[movForm.tipo].map((m) => <option key={m} value={m}>{MOTIVOS[m]}</option>)}
                </select>
              </Campo>
            )}
            {movForm.tipo === 'entrada' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Custo unitário (R$)"><input type="number" min="0" step="0.01" value={movForm.custoStr} onChange={(e) => setMovForm({ ...movForm, custoStr: e.target.value })} className={inputCls} /></Campo>
                  <Campo rotulo="Nº da nota / documento"><input value={movForm.documento ?? ''} onChange={(e) => setMovForm({ ...movForm, documento: e.target.value })} className={inputCls} /></Campo>
                </div>
                <Campo rotulo="Fornecedor">
                  <select value={movForm.fornecedorId ?? ''} onChange={(e) => setMovForm({ ...movForm, fornecedorId: e.target.value })} className={inputCls}>
                    <option value="">Não informar</option>
                    {fornecedores.map((f) => <option key={f.id} value={f.id}>{nomeForn(f)}</option>)}
                  </select>
                </Campo>
                {movForm.motivo === 'compra' && (
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={aPrazo.ativo} onChange={(e) => setAPrazo({ ...aPrazo, ativo: e.target.checked })} /> Compra a prazo: lançar conta a pagar
                    </label>
                    {aPrazo.ativo && (
                      <div className="grid grid-cols-2 gap-3">
                        <Campo rotulo="1º vencimento"><input type="date" value={aPrazo.vencimento} onChange={(e) => setAPrazo({ ...aPrazo, vencimento: e.target.value })} className={inputCls} /></Campo>
                        <Campo rotulo="Parcelas" dica={`Valor: quantidade × custo unitário.`}><input type="number" min="1" max="60" value={aPrazo.parcelas} onChange={(e) => setAPrazo({ ...aPrazo, parcelas: e.target.value })} className={inputCls} /></Campo>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <Campo rotulo="Observação"><textarea value={movForm.observacao ?? ''} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} rows={2} className={inputCls} /></Campo>
          </div>
          {erro && <p role="alert" className="mt-3 text-sm text-destructive">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setMov(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
            <button onClick={registrar} disabled={pendente} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
              {pendente && <Loader2 size={14} className="animate-spin" />} Registrar
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
