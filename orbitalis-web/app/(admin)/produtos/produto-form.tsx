'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardList, Ruler, CircleDollarSign, Boxes, FileText, Building2, Loader2, RefreshCw } from 'lucide-react'
import { Campo, inputCls } from '@/components/ui/modal'
import { brl, nomeForn, UNIDADES, type Fornecedor, type Produto } from '@/lib/suprimentos'
import { salvarProduto, type DadosProduto } from './actions'

const ABAS = [
  { id: 'dados', rotulo: 'Dados', dica: 'Nome, códigos e configurações', Icone: ClipboardList },
  { id: 'detalhes', rotulo: 'Detalhes', dica: 'Pesos, dimensões e descrição', Icone: Ruler },
  { id: 'valores', rotulo: 'Valores', dica: 'Custo e valor de venda', Icone: CircleDollarSign },
  { id: 'estoque', rotulo: 'Estoque', dica: 'Quantidades e limites', Icone: Boxes },
  { id: 'fiscal', rotulo: 'Fiscal', dica: 'NCM, CEST e origem', Icone: FileText },
  { id: 'fornecedores', rotulo: 'Fornecedores', dica: 'Quem fornece este produto', Icone: Building2 },
] as const
type AbaId = (typeof ABAS)[number]['id']

const ORIGENS = ['0 — Nacional', '1 — Estrangeira (importação direta)', '2 — Estrangeira (adquirida no mercado interno)', '3 — Nacional, importação 40% a 70%', '4 — Nacional, processos produtivos básicos', '5 — Nacional, importação até 40%', '6 — Estrangeira, sem similar nacional (importação direta)', '7 — Estrangeira, sem similar nacional (mercado interno)', '8 — Nacional, importação acima de 70%']

const VAZIO: DadosProduto = {
  nome: '', descricao: '', codigoInterno: '', codigoBarras: '', marca: '', categoria: '', unidade: 'un', ncm: '',
  precoCusto: 0, precoVenda: 0, controlaEstoque: true, estoqueMinimo: 0, localizacao: '', fornecedorPadraoId: '', saldoInicial: 0,
  estoqueMaximo: 0, cest: '', pesoBruto: 0, pesoLiquido: 0, comissaoPercentual: 0, despesasAcessorias: 0, outrasDespesas: 0,
  largura: 0, altura: 0, comprimento: 0, codBeneficio: '', ativo: true,
}
const n = (v: unknown) => Number(v ?? 0)
const doProduto = (p: Produto): DadosProduto => ({
  nome: p.nome, descricao: p.descricao ?? '', codigoInterno: p.codigoInterno ?? '', codigoBarras: p.codigoBarras ?? '',
  marca: p.marca ?? '', categoria: p.categoria ?? '', unidade: p.unidade, ncm: p.ncm ?? '', precoCusto: n(p.precoCusto),
  precoVenda: n(p.precoVenda), controlaEstoque: p.controlaEstoque, estoqueMinimo: n(p.estoqueMinimo), localizacao: p.localizacao ?? '',
  fornecedorPadraoId: p.fornecedorPadraoId ?? '', estoqueMaximo: n(p.estoqueMaximo), cest: p.cest ?? '', origem: p.origem ?? undefined,
  pesoBruto: n(p.pesoBruto), pesoLiquido: n(p.pesoLiquido), comissaoPercentual: n(p.comissaoPercentual),
  despesasAcessorias: n(p.despesasAcessorias), outrasDespesas: n(p.outrasDespesas), largura: n(p.largura), altura: n(p.altura),
  comprimento: n(p.comprimento), codBeneficio: p.codBeneficio ?? '', ativo: p.ativo,
})
const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')))
const arred = (x: number) => Math.round(x * 100) / 100

function Cartao({ titulo, destaque, dica, children }: { titulo: string; destaque: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-border overflow-hidden">
      <header className="px-5 py-4 border-b border-border bg-surface">
        <h2 className="text-base text-gray-900">{titulo} <strong className="font-semibold">{destaque}</strong></h2>
        {dica && <p className="text-xs text-gray-500 mt-1">{dica}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function ProdutoForm({ produto, categorias, fornecedores }: { produto?: Produto; categorias: string[]; fornecedores: Fornecedor[] }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [aba, setAba] = useState<AbaId>('dados')
  const [form, setForm] = useState<DadosProduto>(produto ? doProduto(produto) : VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const set = <K extends keyof DadosProduto>(k: K, v: DadosProduto[K]) => setForm((f) => ({ ...f, [k]: v }))
  const dec = (k: keyof DadosProduto, step = '0.01') => (
    <input type="number" min="0" step={step} value={(form[k] as number) || ''} onChange={(e) => set(k, num(e.target.value) as never)} className={inputCls} />
  )

  const custoFinal = arred(n(form.precoCusto) + n(form.despesasAcessorias) + n(form.outrasDespesas))
  const lucro = custoFinal > 0 ? arred(((n(form.precoVenda) - custoFinal) / custoFinal) * 100) : 0

  function salvar() {
    if (form.nome.trim().length < 2) { setAba('dados'); setErro('Informe o nome do produto'); return }
    setErro(null)
    iniciar(async () => {
      const r = await salvarProduto(produto?.id ?? null, form)
      if (r.ok) { router.push('/produtos'); router.refresh() } else setErro(r.erro)
    })
  }
  const gerarCodigo = () => set('codigoInterno', `PRD${Date.now().toString(36).toUpperCase().slice(-6)}`)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
      <nav aria-label="Seções do produto" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
        {ABAS.map(({ id, rotulo, dica, Icone }) => (
          <button key={id} type="button" onClick={() => setAba(id)} aria-current={aba === id ? 'page' : undefined}
            className={`shrink-0 lg:w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors ${aba === id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-800 border-border hover:bg-surface'}`}>
            <Icone size={18} className="shrink-0" aria-hidden="true" />
            <span><span className="block text-sm font-semibold">{rotulo}</span><span className={`hidden lg:block text-xs ${aba === id ? 'text-white/80' : 'text-gray-500'}`}>{dica}</span></span>
          </button>
        ))}
      </nav>

      <div className="space-y-5 min-w-0">
        {aba === 'dados' && (
          <Cartao titulo="Informe os" destaque="dados principais" dica="Nome, códigos e as opções que definem como o produto se comporta no sistema.">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <Campo rotulo="Nome *" className="sm:col-span-6"><input value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputCls} autoFocus /></Campo>
              <Campo rotulo="Código interno" className="sm:col-span-2" dica="Também usado para atualizar o produto ao importar planilha.">
                <div className="flex gap-2">
                  <input value={form.codigoInterno} onChange={(e) => set('codigoInterno', e.target.value)} className={inputCls} maxLength={60} />
                  <button type="button" onClick={gerarCodigo} className="shrink-0 inline-flex items-center gap-1 px-3 border border-border rounded-lg text-sm font-medium text-gray-700 hover:bg-surface"><RefreshCw size={13} /> Gerar</button>
                </div>
              </Campo>
              <Campo rotulo="Código de barras" className="sm:col-span-2"><input value={form.codigoBarras} onChange={(e) => set('codigoBarras', e.target.value)} className={inputCls} maxLength={60} /></Campo>
              <Campo rotulo="Grupo do produto" className="sm:col-span-2">
                <input value={form.categoria} onChange={(e) => set('categoria', e.target.value)} list="categorias-produto" className={inputCls} placeholder="Ex.: Gases, Elétrica" />
                <datalist id="categorias-produto">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>
              <Campo rotulo="Marca" className="sm:col-span-2"><input value={form.marca} onChange={(e) => set('marca', e.target.value)} className={inputCls} /></Campo>
              <Campo rotulo="Unidade de medida" className="sm:col-span-2">
                <select value={form.unidade} onChange={(e) => set('unidade', e.target.value)} className={inputCls}>
                  {(UNIDADES.includes(form.unidade) ? UNIDADES : [form.unidade, ...UNIDADES]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Movimenta estoque?" className="sm:col-span-2" dica="“Não” para itens sob encomenda, sem saldo em prateleira.">
                <select value={form.controlaEstoque ? 'sim' : 'nao'} onChange={(e) => set('controlaEstoque', e.target.value === 'sim')} className={inputCls}><option value="sim">Sim</option><option value="nao">Não</option></select>
              </Campo>
              <Campo rotulo="Local no estoque" className="sm:col-span-6"><input value={form.localizacao} onChange={(e) => set('localizacao', e.target.value)} className={inputCls} placeholder="Prateleira, carro…" /></Campo>
            </div>
          </Cartao>
        )}

        {aba === 'detalhes' && (
          <>
            <Cartao titulo="Defina as" destaque="regras de venda" dica="Disponibilidade e comissão do vendedor.">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <label className="sm:col-span-4 flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.ativo !== false} onChange={(e) => set('ativo', e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-action)]" />
                  <span><span className="block text-sm font-medium text-gray-700">Produto ativo</span><span className="block text-xs text-gray-500">Inativo, deixa de aparecer em orçamentos e buscas.</span></span>
                </label>
                <Campo rotulo="Comissão do vendedor (%)" className="sm:col-span-2"><input type="number" min="0" max="100" step="0.01" value={form.comissaoPercentual || ''} onChange={(e) => set('comissaoPercentual', num(e.target.value))} className={inputCls} /></Campo>
              </div>
            </Cartao>
            <Cartao titulo="Informe" destaque="pesos e dimensões" dica="Peso em quilos e medidas em metros.">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Campo rotulo="Peso bruto (kg)" dica="Com embalagem">{dec('pesoBruto', '0.001')}</Campo>
                <Campo rotulo="Peso líquido (kg)" dica="Sem embalagem">{dec('pesoLiquido', '0.001')}</Campo>
                <Campo rotulo="Largura (m)">{dec('largura', '0.001')}</Campo>
                <Campo rotulo="Altura (m)">{dec('altura', '0.001')}</Campo>
                <Campo rotulo="Comprimento (m)">{dec('comprimento', '0.001')}</Campo>
              </div>
            </Cartao>
            <Cartao titulo="Escreva a" destaque="descrição" dica="Características e diferenciais que ajudem a identificar o produto.">
              <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} rows={5} className={inputCls} aria-label="Descrição" />
            </Cartao>
          </>
        )}

        {aba === 'valores' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Cartao titulo="" destaque="Custo do produto" dica="Valor pago e despesas da compra.">
              <div className="space-y-4">
                <Campo rotulo="Valor de custo (R$)" dica="Preço pago pela mercadoria.">{dec('precoCusto')}</Campo>
                <Campo rotulo="Despesas acessórias (R$)" dica="Frete, seguro e outras despesas ligadas à compra.">{dec('despesasAcessorias')}</Campo>
                <Campo rotulo="Outras despesas (R$)">{dec('outrasDespesas')}</Campo>
                <Campo rotulo="Custo final" dica="Calculado: valor de custo + despesas."><input readOnly value={brl(custoFinal)} className={`${inputCls} bg-surface font-semibold`} /></Campo>
              </div>
            </Cartao>
            <Cartao titulo="Defina o" destaque="valor de venda" dica="Informe o valor direto ou o lucro desejado sobre o custo final.">
              <div className="space-y-4">
                <Campo rotulo="Valor de venda (R$)">{dec('precoVenda')}</Campo>
                <Campo rotulo="Lucro sobre o custo (%)" dica="Ao alterar, o valor de venda é recalculado.">
                  <input type="number" step="0.01" value={custoFinal > 0 ? lucro : ''} disabled={custoFinal <= 0}
                    onChange={(e) => set('precoVenda', arred(custoFinal * (1 + num(e.target.value) / 100)))} className={inputCls} />
                </Campo>
                {custoFinal <= 0 && <p className="text-xs text-gray-500">Informe o custo para calcular o lucro.</p>}
              </div>
            </Cartao>
          </div>
        )}

        {aba === 'estoque' && (
          <Cartao titulo="Informe o" destaque="estoque" dica="Quantidade atual e os limites mínimo e máximo que você quer manter.">
            {!form.controlaEstoque ? (
              <p className="text-sm text-gray-600">Este produto não movimenta estoque. Altere em “Dados → Movimenta estoque?” se quiser controlar o saldo.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo rotulo={`Estoque mínimo (${form.unidade})`} dica="Avisa quando o saldo chegar nele.">{dec('estoqueMinimo', '0.001')}</Campo>
                <Campo rotulo={`Estoque máximo (${form.unidade})`} dica="Quantidade máxima que você quer manter.">{dec('estoqueMaximo', '0.001')}</Campo>
                {produto ? (
                  <Campo rotulo={`Quantidade atual (${form.unidade})`} dica="O saldo só muda por movimentação ou inventário, assim o histórico fica correto.">
                    <input readOnly value={n(produto.saldo)} className={`${inputCls} bg-surface font-semibold`} />
                  </Campo>
                ) : (
                  <Campo rotulo={`Quantidade atual (${form.unidade})`} dica="O que já existe hoje; vira o saldo inicial.">{dec('saldoInicial', '0.001')}</Campo>
                )}
              </div>
            )}
          </Cartao>
        )}

        {aba === 'fiscal' && (
          <Cartao titulo="Informe os" destaque="dados fiscais" dica="Aparecem na hora de emitir a nota fiscal.">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Campo rotulo="NCM" dica="Classificação fiscal da mercadoria."><input value={form.ncm} onChange={(e) => set('ncm', e.target.value)} className={inputCls} maxLength={10} /></Campo>
              <Campo rotulo="CEST" dica="Para produtos com substituição tributária."><input value={form.cest ?? ''} onChange={(e) => set('cest', e.target.value)} className={inputCls} maxLength={10} /></Campo>
              <Campo rotulo="Origem" className="sm:col-span-2">
                <select value={form.origem ?? ''} onChange={(e) => set('origem', e.target.value === '' ? undefined : Number(e.target.value))} className={inputCls}>
                  <option value="">Selecione</option>
                  {ORIGENS.map((o, i) => <option key={i} value={i}>{o}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Cód. benefício" dica="Código do benefício fiscal concedido pelo estado."><input value={form.codBeneficio ?? ''} onChange={(e) => set('codBeneficio', e.target.value)} className={inputCls} maxLength={20} /></Campo>
            </div>
          </Cartao>
        )}

        {aba === 'fornecedores' && (
          <Cartao titulo="Vincule o" destaque="fornecedor" dica="De quem você compra este produto.">
            <Campo rotulo="Fornecedor padrão" className="max-w-md">
              <select value={form.fornecedorPadraoId} onChange={(e) => set('fornecedorPadraoId', e.target.value)} className={inputCls}>
                <option value="">Nenhum</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{nomeForn(f)}</option>)}
              </select>
            </Campo>
            <p className="mt-3 text-sm text-gray-500">Não encontrou? <Link href="/fornecedores" className="text-primary font-medium hover:underline">Cadastre o fornecedor</Link>.</p>
          </Cartao>
        )}

        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <div className="flex items-center justify-between">
          <Link href="/produtos" className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg bg-white hover:bg-surface">Cancelar</Link>
          <button type="button" onClick={salvar} disabled={pendente} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
            {pendente && <Loader2 size={14} className="animate-spin" />} {produto ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
