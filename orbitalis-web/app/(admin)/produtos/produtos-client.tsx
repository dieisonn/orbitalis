'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, Loader2, ArrowDownUp, History } from 'lucide-react'
import { PlanilhaBotoes } from '@/components/ui/planilha-botoes'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { brl, qtd, nomeForn, UNIDADES, MOTIVOS, MOTIVOS_POR_TIPO, type Fornecedor, type Produto } from '@/lib/suprimentos'
import { excluirProduto, alternarProduto, movimentarProduto, type DadosMovimento } from './actions'

type Filtros = { q: string; situacao: string; categoria: string; ativo: string }

const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')))

function SaldoBadge({ p }: { p: Produto }) {
  if (!p.controlaEstoque) return <span className="text-xs text-gray-400">sem controle</span>
  const s = Number(p.saldo), min = Number(p.estoqueMinimo)
  const cls = s <= 0 ? 'bg-red-50 text-red-700 border-red-200' : min > 0 && s <= min ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>{qtd(s)} {p.unidade}</span>
}

export function ProdutosClient({ produtos, categorias, fornecedores, filtros }: { produtos: Produto[]; categorias: string[]; fornecedores: Fornecedor[]; filtros: Filtros }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [busca, setBusca] = useState(filtros.q)
  const [erro, setErro] = useState<string | null>(null)
  const [mov, setMov] = useState<Produto | null>(null)
  const [movForm, setMovForm] = useState<DadosMovimento & { qStr: string; custoStr: string }>({ tipo: 'entrada', quantidade: 0, motivo: 'compra', qStr: '', custoStr: '' })

  function filtrar(patch: Partial<Filtros>) {
    const f = { ...filtros, q: busca.trim(), ...patch }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
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
          <PlanilhaBotoes recurso="produtos" nome="produtos" estoque />
          <Link href="/produtos/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo produto
          </Link>
        </div>

        {produtos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{Object.values(filtros).some(Boolean) ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Produto</th>
                  <th className="hidden md:table-cell text-left px-4 py-3">Categoria</th>
                  <th className="hidden sm:table-cell text-right px-4 py-3">Custo</th>
                  <th className="hidden sm:table-cell text-right px-4 py-3">Venda</th>
                  <th className="text-right px-4 py-3">Estoque</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {produtos.map((p) => (
                  <tr key={p.id} className={p.ativo ? '' : 'opacity-60'}>
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
      </div>

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
