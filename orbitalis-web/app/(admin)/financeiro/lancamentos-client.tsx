'use client'
import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CheckCircle2, Pencil, Plus, RotateCcw, Search, Trash2, Ban } from 'lucide-react'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { Paginacao } from '@/components/ui/paginacao'
import { ThOrdenavel, useOrdemUrl } from '@/components/ui/th-ordenavel'
import { ClienteSelect } from '@/components/ui/cliente-select'
import type { Ordem } from '@/lib/ordenacao'
import { brl, dataBr, hojeIso, nomePessoa, SITUACAO_COR, SITUACAO_LABEL, type Categoria, type Conta, type Lancamento, type TipoLanc } from '@/lib/financeiro'
import { acaoLancamento, baixarLancamento, criarLancamento, editarLancamento, excluirLancamento } from './actions'

type Pessoa = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Filtros = { status: string; q: string; de: string; ate: string; contaId: string; categoriaId: string }

const CAMPOS_ORDEM = ['vencimento', 'descricao', 'valor', 'status', 'pagoEm', 'numero']
const PADRAO: Ordem = { ordem: 'vencimento', dir: 'asc' }

export function LancamentosClient({ tipo, itens, total, somaValor, pagina, limite, contas, categorias, clientes, fornecedores, filtros }: {
  tipo: TipoLanc; itens: Lancamento[]; total: number; somaValor: number; pagina: number; limite: number
  contas: Conta[]; categorias: Categoria[]; clientes: Pessoa[]; fornecedores: Pessoa[]; filtros: Filtros
}) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams()
  const receber = tipo === 'receber'
  const ordem = useOrdemUrl(CAMPOS_ORDEM, PADRAO)
  const [busca, setBusca] = useState(filtros.q)
  const [form, setForm] = useState<{ editar?: Lancamento } | null>(null)
  const [baixa, setBaixa] = useState<Lancamento | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  const aplicar = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString()); p.delete('pagina')
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k) }
    router.push(`${path}${p.size ? `?${p}` : ''}`)
  }
  const STATUS = [['aberto', 'Em aberto'], ['atrasado', 'Atrasados'], ['pago', receber ? 'Recebidos' : 'Pagos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']]

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null)
    iniciar(async () => { const r = await fn(); if (!r.ok) setErro(r.erro ?? 'Não foi possível concluir') })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Situação">
          {STATUS.map(([k, r]) => (
            <button key={k} type="button" onClick={() => aplicar({ status: k === 'aberto' ? '' : k })} aria-pressed={filtros.status === k}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${filtros.status === k ? 'bg-primary text-white border-primary' : 'border-border text-gray-700 hover:bg-surface'}`}>{r}</button>
          ))}
        </div>
        <button type="button" onClick={() => setForm({})} className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90">
          <Plus size={15} aria-hidden /> {receber ? 'Nova conta a receber' : 'Nova conta a pagar'}
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); aplicar({ q: busca.trim() }) }} className="bg-white border border-border rounded-xl p-3 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[12rem] text-xs font-medium text-gray-600">Buscar
          <span className="relative block mt-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={receber ? 'Descrição, cliente, nº…' : 'Descrição, fornecedor, NF, nº…'} className={`${inputCls} pl-9`} /></span>
        </label>
        <label className="text-xs font-medium text-gray-600">{filtros.status === 'pago' ? 'Pago de' : 'Vence de'}<input type="date" defaultValue={filtros.de} onChange={(e) => aplicar({ de: e.target.value })} className={`${inputCls} mt-1`} /></label>
        <label className="text-xs font-medium text-gray-600">até<input type="date" defaultValue={filtros.ate} onChange={(e) => aplicar({ ate: e.target.value })} className={`${inputCls} mt-1`} /></label>
        <label className="text-xs font-medium text-gray-600">Categoria
          <select value={filtros.categoriaId} onChange={(e) => aplicar({ categoriaId: e.target.value })} className={`${inputCls} mt-1`}><option value="">Todas</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-600">Conta
          <select value={filtros.contaId} onChange={(e) => aplicar({ contaId: e.target.value })} className={`${inputCls} mt-1`}><option value="">Todas</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <button className="px-4 py-2.5 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Buscar</button>
        {(filtros.q || filtros.de || filtros.ate || filtros.contaId || filtros.categoriaId) && <button type="button" onClick={() => { setBusca(''); aplicar({ q: '', de: '', ate: '', contaId: '', categoriaId: '' }) }} className="px-2 py-2.5 text-sm text-gray-600 underline">Limpar</button>}
      </form>

      {erro && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {itens.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">Nenhuma conta {receber ? 'a receber' : 'a pagar'} com esses filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <ThOrdenavel campo="vencimento" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Vencimento</ThOrdenavel>
                  <ThOrdenavel campo="descricao" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Descrição</ThOrdenavel>
                  <th className="text-left px-4 py-3 hidden md:table-cell">{receber ? 'Cliente' : 'Fornecedor'}</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Categoria</th>
                  <ThOrdenavel campo="valor" atual={ordem} padrao={PADRAO} className="text-right px-4 py-3">Valor</ThOrdenavel>
                  <ThOrdenavel campo="status" atual={ordem} padrao={PADRAO} className="text-left px-4 py-3">Situação</ThOrdenavel>
                  <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itens.map((l) => (
                  <tr key={l.id} className={l.situacao === 'cancelado' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{dataBr(l.vencimento)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{l.descricao}</p>
                      <p className="text-xs text-gray-500">#{l.numero}{l.documento ? ` · NF ${l.documento}` : ''}{l.orcamento && <> · <Link href={`/orcamentos/${l.orcamento.id}`} className="text-primary hover:underline">orçamento #{String(l.orcamento.numero).padStart(4, '0')}</Link></>}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-700">{nomePessoa(receber ? l.cliente : l.fornecedor)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{l.categoria?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {brl(l.valor)}
                      {l.status === 'pago' && l.valorPago != null && l.valorPago !== l.valor && <p className="text-xs font-normal text-gray-500">{receber ? 'recebido' : 'pago'} {brl(l.valorPago)}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SITUACAO_COR[l.situacao]}`}>{l.status === 'pago' ? (receber ? 'Recebido' : 'Pago') : SITUACAO_LABEL[l.situacao]}</span>
                      {l.status === 'pago' && <p className="text-xs text-gray-500 mt-0.5">em {dataBr(l.pagoEm)}{l.conta ? ` · ${l.conta.nome}` : ''}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {l.status === 'aberto' && <button type="button" onClick={() => setBaixa(l)} title={receber ? 'Registrar recebimento' : 'Registrar pagamento'} aria-label={`${receber ? 'Receber' : 'Pagar'} ${l.descricao}`} className="p-1.5 text-green-700 hover:bg-green-50 rounded-md"><CheckCircle2 size={15} /></button>}
                        {l.status === 'pago' && <button type="button" disabled={pendente} onClick={() => confirm('Estornar a baixa? O lançamento volta para em aberto.') && executar(() => acaoLancamento(l.id, 'estornar'))} title="Estornar baixa" aria-label={`Estornar ${l.descricao}`} className="p-1.5 text-gray-500 hover:bg-surface rounded-md"><RotateCcw size={15} /></button>}
                        {l.status !== 'cancelado' && <button type="button" onClick={() => setForm({ editar: l })} title="Editar" aria-label={`Editar ${l.descricao}`} className="p-1.5 text-gray-500 hover:text-primary hover:bg-surface rounded-md"><Pencil size={15} /></button>}
                        {l.status !== 'pago' && <button type="button" disabled={pendente} onClick={() => executar(() => acaoLancamento(l.id, 'cancelar'))} title={l.status === 'cancelado' ? 'Reativar' : 'Cancelar'} aria-label={`${l.status === 'cancelado' ? 'Reativar' : 'Cancelar'} ${l.descricao}`} className="p-1.5 text-gray-500 hover:bg-surface rounded-md">{l.status === 'cancelado' ? <RotateCcw size={15} /> : <Ban size={15} />}</button>}
                        {l.status !== 'pago' && <button type="button" disabled={pendente} onClick={() => confirm(`Excluir "${l.descricao}"?`) && executar(() => excluirLancamento(l.id))} title="Excluir" aria-label={`Excluir ${l.descricao}`} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-surface"><td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total do filtro ({total})</td><td className="px-4 py-3 text-right font-bold text-gray-900">{brl(somaValor)}</td><td colSpan={2} /></tr>
              </tfoot>
            </table>
          </div>
        )}
        <Paginacao total={total} pagina={pagina} limite={limite} />
      </div>

      {form && <FormLancamento tipo={tipo} editar={form.editar} contas={contas} categorias={categorias} clientes={clientes} fornecedores={fornecedores} onFechar={() => setForm(null)} />}
      {baixa && <FormBaixa lanc={baixa} receber={receber} contas={contas} onFechar={() => setBaixa(null)} />}
    </div>
  )
}

function FormLancamento({ tipo, editar, contas, categorias, clientes, fornecedores, onFechar }: {
  tipo: TipoLanc; editar?: Lancamento; contas: Conta[]; categorias: Categoria[]; clientes: Pessoa[]; fornecedores: Pessoa[]; onFechar: () => void
}) {
  const receber = tipo === 'receber'
  const [descricao, setDescricao] = useState(editar?.descricao ?? '')
  const [valor, setValor] = useState(editar ? String(editar.valor) : '')
  const [vencimento, setVencimento] = useState(editar?.vencimento ?? hojeIso())
  const [categoriaId, setCategoriaId] = useState(editar?.categoria?.id ?? '')
  const [clienteId, setClienteId] = useState(editar?.cliente?.id ?? '')
  const [fornecedorId, setFornecedorId] = useState(editar?.fornecedor?.id ?? '')
  const [contaId, setContaId] = useState(editar?.conta?.id ?? '')
  const [documento, setDocumento] = useState(editar?.documento ?? '')
  const [observacoes, setObservacoes] = useState(editar?.observacoes ?? '')
  const [parcelas, setParcelas] = useState('1')
  const [intervalo, setIntervalo] = useState<'mensal' | 'quinzenal' | 'semanal'>('mensal')
  const [jaPago, setJaPago] = useState(false)
  const [pagoEm, setPagoEm] = useState(hojeIso())
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const router = useRouter()
  const pago = editar?.status === 'pago'
  const n = Math.max(1, Math.min(60, parseInt(parcelas) || 1))
  const pessoas = useMemo(() => (receber ? clientes : fornecedores), [receber, clientes, fornecedores])

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const v = parseFloat(valor.replace(',', '.'))
    if (!pago && !(v > 0)) { setErro('Informe um valor maior que zero'); return }
    iniciar(async () => {
      // vazio = limpar o campo (a API troca '' por null)
      const r = editar
        ? await editarLancamento(editar.id, {
            descricao, documento, observacoes, categoriaId, contaId, ...(receber ? { clienteId } : { fornecedorId }),
            ...(pago ? {} : { valor: v, vencimento }),
          })
        : await criarLancamento({
            tipo, descricao, documento, observacoes, valor: v, vencimento,
            categoriaId: categoriaId || undefined, contaId: contaId || undefined, ...(receber ? { clienteId: clienteId || undefined } : { fornecedorId: fornecedorId || undefined }),
            parcelas: n > 1 ? n : undefined, intervalo: n > 1 ? intervalo : undefined, baixa: jaPago ? { pagoEm, contaId: contaId || undefined } : undefined,
          })
      if (!r.ok) { setErro(r.erro); return }
      onFechar(); router.refresh()
    })
  }

  return (
    <Modal titulo={editar ? `Editar #${editar.numero}` : receber ? 'Nova conta a receber' : 'Nova conta a pagar'} onFechar={onFechar} largura="max-w-2xl">
      <form onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Descrição *"><input required value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} className={inputCls} placeholder={receber ? 'Ex.: Manutenção preventiva — Cliente X' : 'Ex.: Compra de gás R410A'} /></Campo>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo rotulo={n > 1 ? 'Valor total *' : 'Valor *'}><input required={!pago} disabled={pago} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} placeholder="0,00" /></Campo>
          <Campo rotulo={n > 1 ? '1º vencimento *' : 'Vencimento *'}><input required={!pago} disabled={pago} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={inputCls} /></Campo>
          <Campo rotulo="Categoria"><select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}><option value="">Sem categoria</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo rotulo={receber ? 'Cliente' : 'Fornecedor'}>
            {receber
              ? <ClienteSelect clientes={clientes} value={clienteId} onChange={setClienteId} ariaLabel="Cliente" />
              : <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className={inputCls}><option value="">Sem fornecedor</option>{pessoas.map((p) => <option key={p.id} value={p.id}>{nomePessoa(p)}</option>)}</select>}
          </Campo>
          <Campo rotulo="Conta"><select value={contaId} onChange={(e) => setContaId(e.target.value)} className={inputCls}><option value="">Conta padrão</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        </div>
        <Campo rotulo="Nº do documento / NF"><input value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={60} className={inputCls} /></Campo>
        {!editar && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
            <Campo rotulo="Parcelas"><input type="number" min={1} max={60} value={parcelas} disabled={jaPago} onChange={(e) => setParcelas(e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Intervalo"><select value={intervalo} disabled={n < 2} onChange={(e) => setIntervalo(e.target.value as typeof intervalo)} className={inputCls}><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="semanal">Semanal</option></select></Campo>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5"><input type="checkbox" checked={jaPago} disabled={n > 1} onChange={(e) => setJaPago(e.target.checked)} /> {receber ? 'Já recebido' : 'Já pago'}</label>
          </div>
        )}
        {jaPago && <Campo rotulo={receber ? 'Data do recebimento' : 'Data do pagamento'}><input type="date" max={hojeIso()} value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} className={inputCls} /></Campo>}
        <Campo rotulo="Observações"><textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} maxLength={2000} className={`${inputCls} resize-none`} /></Campo>
        {pago && <p className="text-xs text-gray-500">Lançamento já baixado: valor e vencimento só mudam depois de estornar a baixa.</p>}
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button disabled={pendente} className="px-5 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90 disabled:opacity-50">{pendente ? 'Salvando…' : editar ? 'Salvar' : n > 1 ? `Criar ${n} parcelas` : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FormBaixa({ lanc, receber, contas, onFechar }: { lanc: Lancamento; receber: boolean; contas: Conta[]; onFechar: () => void }) {
  const [pagoEm, setPagoEm] = useState(hojeIso())
  const [valorPago, setValorPago] = useState(String(lanc.valor))
  const [contaId, setContaId] = useState(lanc.conta?.id ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const router = useRouter()
  function confirmar(e: React.FormEvent) {
    e.preventDefault(); setErro(null)
    const v = parseFloat(valorPago.replace(',', '.'))
    if (!(v > 0)) { setErro('Informe o valor'); return }
    iniciar(async () => {
      const r = await baixarLancamento(lanc.id, { pagoEm, valorPago: v, contaId: contaId || undefined })
      if (!r.ok) { setErro(r.erro); return }
      onFechar(); router.refresh()
    })
  }
  return (
    <Modal titulo={receber ? 'Registrar recebimento' : 'Registrar pagamento'} onFechar={onFechar}>
      <form onSubmit={confirmar} className="space-y-4">
        <p className="text-sm text-gray-700"><strong>{lanc.descricao}</strong><br /><span className="text-gray-500">Vence em {dataBr(lanc.vencimento)} · {brl(lanc.valor)}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo={receber ? 'Data do recebimento' : 'Data do pagamento'}><input type="date" required max={hojeIso()} value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} className={inputCls} /></Campo>
          <Campo rotulo={receber ? 'Valor recebido' : 'Valor pago'} dica="Se for diferente do previsto (juros, desconto), informe aqui."><input required inputMode="decimal" value={valorPago} onChange={(e) => setValorPago(e.target.value)} className={inputCls} /></Campo>
        </div>
        <Campo rotulo="Conta"><select value={contaId} onChange={(e) => setContaId(e.target.value)} className={inputCls}><option value="">Conta padrão</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button disabled={pendente} className="px-5 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90 disabled:opacity-50">{pendente ? 'Salvando…' : 'Confirmar'}</button></div>
      </form>
    </Modal>
  )
}
