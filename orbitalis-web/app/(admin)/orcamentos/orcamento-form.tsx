'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Search, Package, Wrench, AlertTriangle, CalendarClock } from 'lucide-react'
import { ChecklistSelect } from '@/components/ui/checklist-select'
import { TIPO_OS_LABEL, type ModeloResumo, type TipoOs } from '@/lib/checklist'
import { ClienteSelect } from '@/components/ui/cliente-select'
import { calcularTotais, FORMAS_PAGAMENTO, gerarParcelas, somaParcelas, type OrcamentoCompleto } from '@/lib/orcamento'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; clienteId: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }
export type ProdutoOpt = { id: string; nome: string; codigo: string | null; unidade: string; preco: number; controlaEstoque: boolean; saldo: number }
export type ServicoOpt = { id: string; nome: string; codigo: string | null; unidade: string; preco: number }
type ItemRow = { key: number; descricao: string; quantidade: string; unidade: string; precoUnitario: string; categoria: 'servico' | 'peca'; produtoId?: string; servicoId?: string }
type ParcelaRow = { vencimento: string; valor: string }

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30'
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hojeMais = (dias: number) => new Date(Date.now() - 3 * 3600_000 + dias * 86_400_000).toISOString().slice(0, 10)
let seq = 1

export function OrcamentoForm({
  clientes, ambientes, tiposServico, modelos, visitas = [], produtos, servicos, inicial, prefill,
}: {
  clientes: Cliente[]
  ambientes: Ambiente[]
  visitas?: { id: string; clienteId: string; numero: number | null; sigla: string; dataConclusao: string | null }[]
  tiposServico: TipoServico[]
  modelos: ModeloResumo[]
  produtos: ProdutoOpt[]
  servicos: ServicoOpt[]
  /** Preenchido na edição */
  inicial?: OrcamentoCompleto
  /** Novo orçamento vindo de uma visita */
  prefill?: { clienteId: string; ambienteId: string; visitaOrigemId: string; titulo: string }
}) {
  const router = useRouter()
  const editando = !!inicial
  const [titulo, setTitulo] = useState(inicial?.titulo ?? prefill?.titulo ?? '')
  const [clienteId, setClienteId] = useState(inicial?.clienteId ?? prefill?.clienteId ?? '')
  const [validadeDias, setValidadeDias] = useState(String(inicial?.validadeDias ?? 30))
  const [ambienteId, setAmbienteId] = useState(inicial?.ambienteId ?? prefill?.ambienteId ?? '')
  const [visitaOrigemId, setVisitaOrigemId] = useState(inicial?.visitaOrigemId ?? prefill?.visitaOrigemId ?? '')
  const [tipoOs, setTipoOs] = useState<TipoOs>(inicial?.tipoOs ?? 'corretiva')
  const [tipoServicoId, setTipoServicoId] = useState(inicial?.tipoServicoId ?? '')
  const [modeloChecklistId, setModeloChecklistId] = useState(inicial?.modeloChecklistId ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [observacoesInternas, setObservacoesInternas] = useState(inicial?.observacoesInternas ?? '')
  const [itens, setItens] = useState<ItemRow[]>(() =>
    inicial?.itens.length
      ? inicial.itens.map((i) => ({
          key: seq++, descricao: i.descricao, quantidade: String(Number(i.quantidade)), unidade: i.unidade,
          precoUnitario: String(Number(i.precoUnitario)), categoria: i.categoria, produtoId: i.produtoId ?? undefined, servicoId: i.servicoId ?? undefined,
        }))
      : [],
  )
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>(inicial?.descontoTipo ?? 'valor')
  const [desconto, setDesconto] = useState(inicial && Number(inicial.desconto) ? String(Number(inicial.desconto)) : '')
  const [frete, setFrete] = useState(inicial && Number(inicial.frete) ? String(Number(inicial.frete)) : '')
  const [formaPagamento, setFormaPagamento] = useState(inicial?.formaPagamento ?? '')
  const [parcelas, setParcelas] = useState<ParcelaRow[]>(() => (inicial?.parcelas ?? []).map((p) => ({ vencimento: p.vencimento.slice(0, 10), valor: String(Number(p.valor)) })))
  const [nParcelas, setNParcelas] = useState(String(inicial?.parcelas.length || 1))
  const [primeiroVenc, setPrimeiroVenc] = useState(inicial?.parcelas[0]?.vencimento.slice(0, 10) ?? hojeMais(30))
  const [intervalo, setIntervalo] = useState('30')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // busca no catálogo
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  const visitasDoCliente = visitas.filter((v) => v.clienteId === clienteId)
  const ambientesDoCliente = ambientes.filter((a) => a.clienteId === clienteId)
  const prodPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return []
    const bate = (nome: string, cod: string | null) => nome.toLowerCase().includes(q) || (cod ?? '').toLowerCase().includes(q)
    return [
      ...produtos.filter((p) => bate(p.nome, p.codigo)).slice(0, 6).map((p) => ({ tipo: 'produto' as const, p })),
      ...servicos.filter((s) => bate(s.nome, s.codigo)).slice(0, 6).map((s) => ({ tipo: 'servico' as const, s })),
    ]
  }, [busca, produtos, servicos])

  const totais = calcularTotais(itens, descontoTipo, desconto, frete)
  const somaParc = somaParcelas(parcelas)
  const parcelasDifere = parcelas.length > 0 && Math.abs(somaParc - totais.total) > 0.011

  function addAvulso() { setItens((p) => [...p, { key: seq++, descricao: '', quantidade: '1', unidade: 'un', precoUnitario: '', categoria: 'servico' }]) }
  function addDoCatalogo(r: (typeof resultados)[number]) {
    setItens((prev) => [
      ...prev,
      r.tipo === 'produto'
        ? { key: seq++, descricao: r.p.nome, quantidade: '1', unidade: r.p.unidade, precoUnitario: String(r.p.preco), categoria: 'peca', produtoId: r.p.id }
        : { key: seq++, descricao: r.s.nome, quantidade: '1', unidade: r.s.unidade, precoUnitario: String(r.s.preco), categoria: 'servico', servicoId: r.s.id },
    ])
    setBusca(''); setAberto(false); buscaRef.current?.focus()
  }
  function removeItem(key: number) { setItens((p) => p.filter((r) => r.key !== key)) }
  function updateItem(key: number, field: keyof ItemRow, val: string) { setItens((p) => p.map((r) => (r.key === key ? { ...r, [field]: val } : r))) }

  function gerar() {
    const n = parseInt(nParcelas) || 1
    setParcelas(gerarParcelas(totais.total, n, primeiroVenc || hojeMais(30), parseInt(intervalo) || 30).map((p) => ({ vencimento: p.vencimento, valor: String(p.valor) })))
  }
  function updateParcela(i: number, campo: keyof ParcelaRow, v: string) { setParcelas((p) => p.map((r, idx) => (idx === i ? { ...r, [campo]: v } : r))) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!clienteId) { setErro('Selecione um cliente'); return }
    if (itens.length === 0) { setErro('Adicione pelo menos um item'); return }
    if (itens.some((it) => !it.descricao.trim() || it.precoUnitario === '' || !(parseFloat(it.quantidade) > 0))) {
      setErro('Preencha descrição, quantidade e preço de todos os itens'); return
    }
    if (parcelasDifere) { setErro(`A soma das parcelas (${brl(somaParc)}) precisa ser igual ao total (${brl(totais.total)}). Use "Gerar parcelas" para refazer.`); return }
    setLoading(true)
    try {
      const body = {
        titulo, clienteId,
        ambienteId: ambienteId || (editando ? null : undefined),
        visitaOrigemId: visitaOrigemId || (editando ? null : undefined),
        tipoOs,
        tipoServicoId: tipoServicoId || (editando ? null : undefined),
        modeloChecklistId: modeloChecklistId || (editando ? null : undefined),
        validadeDias: parseInt(validadeDias) || 30,
        observacoes: observacoes || (editando ? '' : undefined),
        observacoesInternas: observacoesInternas || (editando ? '' : undefined),
        descontoTipo, desconto: parseFloat(desconto) || 0, frete: parseFloat(frete) || 0,
        formaPagamento: formaPagamento || (editando ? '' : undefined),
        parcelas: parcelas.length || editando ? parcelas.map((p) => ({ vencimento: p.vencimento, valor: parseFloat(p.valor) || 0 })) : undefined,
        itens: itens.map((it) => ({
          descricao: it.descricao.trim(), unidade: it.unidade || 'un', quantidade: parseFloat(it.quantidade) || 1,
          precoUnitario: parseFloat(it.precoUnitario), categoria: it.categoria,
          produtoId: it.produtoId, servicoId: it.servicoId,
        })),
      }
      // na edição o cliente não muda (a API não aceita trocar)
      const { clienteId: _c, ...bodyEdicao } = body
      void _c
      const res = await fetch(editando ? `/api/orcamentos/${inicial!.id}` : '/api/orcamentos', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando ? bodyEdicao : body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : (d.message ?? 'Erro ao salvar'))
      const avisos: string[] = d.avisos ?? []
      router.push(`/orcamentos/${d.id}${avisos.length ? `?aviso=${encodeURIComponent(avisos.join(' | '))}` : ''}`)
      router.refresh()
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações gerais */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Informações gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Título da proposta *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Ex: Manutenção preventiva semestral — Sede" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cliente *</label>
            {editando ? (
              <p className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-gray-700">{inicial!.cliente.nomeFantasia ?? inicial!.cliente.razaoSocial}</p>
            ) : (
              <ClienteSelect clientes={clientes} value={clienteId} required ariaLabel="Cliente" onChange={(id) => { setClienteId(id); setAmbienteId(''); setVisitaOrigemId('') }} />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Validade (dias)</label>
            <input type="number" min="1" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações (aparecem para o cliente)</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Condições comerciais, prazo de execução, garantias..." className={`${inputCls} resize-none`} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações internas (só a equipe vê)</label>
            <textarea value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} rows={2} placeholder="Margem, combinados, lembretes..." className={`${inputCls} resize-none`} />
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Itens da proposta</h2>
          <button type="button" onClick={addAvulso} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus size={13} /> Item avulso (digitar)
          </button>
        </div>

        {/* Busca no catálogo de produtos e serviços */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            ref={buscaRef} value={busca} aria-label="Buscar produto ou serviço do cadastro"
            onChange={(e) => { setBusca(e.target.value); setAberto(true) }} onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)}
            placeholder="Buscar produto ou serviço cadastrado (nome ou código)…" className={`${inputCls} pl-9`}
          />
          {aberto && busca.trim() && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-72 overflow-auto" role="listbox">
              {resultados.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">Nada encontrado. Use “Item avulso” para digitar.</li>}
              {resultados.map((r) => (
                <li key={r.tipo === 'produto' ? `p${r.p.id}` : `s${r.s.id}`} role="option" aria-selected={false}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addDoCatalogo(r)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface text-sm">
                    {r.tipo === 'produto' ? <Package size={14} className="text-primary shrink-0" aria-hidden /> : <Wrench size={14} className="text-primary shrink-0" aria-hidden />}
                    <span className="flex-1 min-w-0 truncate text-gray-900">{r.tipo === 'produto' ? r.p.nome : r.s.nome}</span>
                    {r.tipo === 'produto' && r.p.controlaEstoque && <span className={`text-[11px] ${r.p.saldo <= 0 ? 'text-red-600' : 'text-gray-500'}`}>estoque {r.p.saldo}</span>}
                    <span className="text-xs font-medium text-gray-700 shrink-0">{brl(r.tipo === 'produto' ? r.p.preco : r.s.preco)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-border rounded-lg">Busque um produto ou serviço acima, ou adicione um item avulso.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:grid">
              <div className="col-span-4">Descrição</div><div className="col-span-2">Tipo</div><div className="col-span-1">Qtd</div>
              <div className="col-span-1">Un.</div><div className="col-span-2">Preço unit.</div><div className="col-span-2 text-right">Total</div>
            </div>
            {itens.map((item, i) => {
              const subtotal = (parseFloat(item.quantidade) || 0) * (parseFloat(item.precoUnitario) || 0)
              const prod = item.produtoId ? prodPorId.get(item.produtoId) : undefined
              const faltaEstoque = prod?.controlaEstoque && inicial?.status !== 'aprovado' && (parseFloat(item.quantidade) || 0) > prod.saldo
              return (
                <div key={item.key} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input value={item.descricao} onChange={(e) => updateItem(item.key, 'descricao', e.target.value)} placeholder="Descrição do serviço ou produto" aria-label={`Descrição do item ${i + 1}`} className={`col-span-12 md:col-span-4 ${inputCls}`} />
                    <select aria-label={`Categoria do item ${i + 1}`} value={item.categoria} onChange={(e) => updateItem(item.key, 'categoria', e.target.value)} className={`col-span-4 md:col-span-2 ${inputCls}`}>
                      <option value="servico">Serviço</option><option value="peca">Peça</option>
                    </select>
                    <input type="number" min="0.001" step="0.001" aria-label={`Quantidade do item ${i + 1}`} value={item.quantidade} onChange={(e) => updateItem(item.key, 'quantidade', e.target.value)} className={`col-span-4 md:col-span-1 ${inputCls}`} />
                    <input aria-label={`Unidade do item ${i + 1}`} value={item.unidade} onChange={(e) => updateItem(item.key, 'unidade', e.target.value)} className={`col-span-4 md:col-span-1 ${inputCls}`} />
                    <input type="number" min="0" step="0.01" placeholder="0,00" aria-label={`Preço unitário do item ${i + 1}`} value={item.precoUnitario} onChange={(e) => updateItem(item.key, 'precoUnitario', e.target.value)} className={`col-span-8 md:col-span-2 ${inputCls}`} />
                    <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-1">
                      <span className="text-xs text-gray-500">{brl(subtotal)}</span>
                      <button type="button" aria-label={`Remover item ${i + 1}`} onClick={() => removeItem(item.key)} className="p-1 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {faltaEstoque && (
                    <p className="flex items-center gap-1 text-[11px] text-amber-700 pl-1"><AlertTriangle size={11} aria-hidden /> Estoque de {prod!.nome}: {prod!.saldo} {prod!.unidade}. Ao aprovar, a baixa não será feita enquanto faltar saldo.</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Totais */}
        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3 content-start">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desconto</label>
              <div className="flex gap-1.5">
                <input type="number" min="0" step="0.01" aria-label="Desconto" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0" className={inputCls} />
                <select aria-label="Tipo de desconto" value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value as 'valor' | 'percentual')} className="px-2 py-2 text-sm bg-surface border border-border rounded-lg">
                  <option value="valor">R$</option><option value="percentual">%</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frete / outras despesas (R$)</label>
              <input type="number" min="0" step="0.01" aria-label="Frete" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
          <dl className="text-sm space-y-1 md:text-right">
            <div className="flex md:justify-end gap-6"><dt className="text-gray-500 w-28 text-left md:text-right">Subtotal</dt><dd className="w-28 text-right">{brl(totais.subtotal)}</dd></div>
            {totais.descontoValor > 0 && <div className="flex md:justify-end gap-6"><dt className="text-gray-500 w-28 text-left md:text-right">Desconto</dt><dd className="w-28 text-right text-red-600">− {brl(totais.descontoValor)}</dd></div>}
            {totais.frete > 0 && <div className="flex md:justify-end gap-6"><dt className="text-gray-500 w-28 text-left md:text-right">Frete / despesas</dt><dd className="w-28 text-right">{brl(totais.frete)}</dd></div>}
            <div className="flex md:justify-end gap-6 pt-1 border-t border-border"><dt className="font-semibold text-gray-900 w-28 text-left md:text-right">Total</dt><dd className="w-28 text-right text-lg font-bold text-gray-900">{brl(totais.total)}</dd></div>
          </dl>
        </div>
      </div>

      {/* Pagamento */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Pagamento</h2>
          <p className="text-xs text-gray-500 mt-0.5">Informativo: aparece no PDF e no link do cliente.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Forma de pagamento</label>
            <input list="formas-pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="PIX, boleto, cartão…" maxLength={60} className={inputCls} />
            <datalist id="formas-pagamento">{FORMAS_PAGAMENTO.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Parcelas</label>
            <input type="number" min="1" max="60" aria-label="Número de parcelas" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">1º vencimento</label>
            <input type="date" aria-label="Primeiro vencimento" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">A cada (dias)</label>
            <input type="number" min="1" max="365" aria-label="Intervalo em dias" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={gerar} disabled={totais.total <= 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface disabled:opacity-50">
            <CalendarClock size={13} aria-hidden /> {parcelas.length ? 'Refazer parcelas' : 'Gerar parcelas'}
          </button>
          {parcelas.length > 0 && <button type="button" onClick={() => setParcelas([])} className="text-xs text-gray-500 hover:text-red-600">Remover parcelas</button>}
        </div>
        {parcelas.length > 0 && (
          <div className="space-y-1.5">
            {parcelas.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-2 md:col-span-1 text-xs text-gray-500">{i + 1}ª</span>
                <input type="date" aria-label={`Vencimento da parcela ${i + 1}`} value={p.vencimento} onChange={(e) => updateParcela(i, 'vencimento', e.target.value)} className={`col-span-6 md:col-span-3 ${inputCls}`} />
                <input type="number" min="0" step="0.01" aria-label={`Valor da parcela ${i + 1}`} value={p.valor} onChange={(e) => updateParcela(i, 'valor', e.target.value)} className={`col-span-4 md:col-span-3 ${inputCls}`} />
              </div>
            ))}
            <p className={`text-xs ${parcelasDifere ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              Soma das parcelas: {brl(somaParc)} {parcelasDifere ? `— difere do total (${brl(totais.total)}). Clique em “Refazer parcelas”.` : '— confere com o total.'}
            </p>
          </div>
        )}
      </div>

      {/* Execução: como a O.S. nasce quando o orçamento for aprovado */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Execução do serviço</h2>
          <p className="text-xs text-gray-500 mt-0.5">Quando o orçamento for aprovado, uma O.S. é criada automaticamente com estes dados (você faz a triagem depois).</p>
        </div>
        {visitasDoCliente.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Visita de origem (opcional)</label>
            <select value={visitaOrigemId} onChange={(e) => setVisitaOrigemId(e.target.value)} className={inputCls}>
              <option value="">Sem visita (orçamento direto)</option>
              {visitasDoCliente.map((v) => (
                <option key={v.id} value={v.id}>{v.sigla}-{String(v.numero ?? 0).padStart(4, '0')}{v.dataConclusao ? ` · ${new Date(v.dataConclusao).toLocaleDateString('pt-BR')}` : ''}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Liga este orçamento à visita que o originou, para medir quantas visitas viram serviço fechado.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ambiente</label>
            <select value={ambienteId} onChange={(e) => setAmbienteId(e.target.value)} disabled={!clienteId} className={`${inputCls} disabled:opacity-50`}>
              <option value="">{clienteId ? 'Definir na aprovação' : 'Selecione o cliente primeiro'}</option>
              {ambientesDoCliente.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de manutenção</label>
            <select value={tipoOs} onChange={(e) => setTipoOs(e.target.value as TipoOs)} className={inputCls}>
              {(Object.keys(TIPO_OS_LABEL) as TipoOs[]).map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de serviço</label>
            <select value={tipoServicoId} onChange={(e) => setTipoServicoId(e.target.value)} className={inputCls}>
              <option value="">Não definido</option>
              {tiposServico.map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Checklist da O.S.</label>
            <ChecklistSelect modelos={modelos} tipo={tipoOs} tipoServicoId={tipoServicoId || null} value={modeloChecklistId} onChange={setModeloChecklistId} className={inputCls} />
          </div>
        </div>
      </div>

      {erro && <p role="alert" className="text-sm text-red-500">{erro}</p>}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editando ? 'Salvar alterações' : 'Salvar rascunho'}
        </button>
      </div>
    </form>
  )
}
