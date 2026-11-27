'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { Paginacao } from '@/components/ui/paginacao'
import { PlanilhaBotoes } from '@/components/ui/planilha-botoes'
import { AvisoLote, BarraSelecao, CheckSelecao, ModalLote, botaoLote, botaoLotePerigo, useSelecao } from '@/components/ui/lote'
import { formatarDocumento, type Fornecedor } from '@/lib/suprimentos'
import { salvarFornecedor, excluirFornecedor, alternarFornecedor, executarLoteFornecedores, type DadosFornecedor } from './actions'

const VAZIO: DadosFornecedor = {
  tipoPessoa: 'J', razaoSocial: '', nomeFantasia: '', cpfCnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '', rg: '', dataNascimento: '', email: '', telefone: '', celular: '',
  contato: '', cep: '', logradouro: '', numeroEndereco: '', complemento: '', bairro: '', cidade: '', uf: '', observacoes: '',
}

const doForn = (f: Fornecedor): DadosFornecedor => ({
  tipoPessoa: f.tipoPessoa, razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia ?? '', cpfCnpj: formatarDocumento(f.cpfCnpj),
  inscricaoEstadual: f.inscricaoEstadual ?? '', inscricaoMunicipal: f.inscricaoMunicipal ?? '', rg: f.rg ?? '', dataNascimento: f.dataNascimento?.slice(0, 10) ?? '', email: f.email ?? '', telefone: f.telefone ?? '', celular: f.celular ?? '',
  contato: f.contato ?? '', cep: f.cep ?? '', logradouro: f.logradouro ?? '', numeroEndereco: f.numeroEndereco ?? '',
  complemento: f.complemento ?? '', bairro: f.bairro ?? '', cidade: f.cidade ?? '', uf: f.uf ?? '', observacoes: f.observacoes ?? '',
})

export function FornecedoresClient({ fornecedores, total, pagina, limite, q, ativo }: { fornecedores: Fornecedor[]; total: number; pagina: number; limite: number; q: string; ativo: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [busca, setBusca] = useState(q)
  const [modal, setModal] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState<DadosFornecedor>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const sel = useSelecao(fornecedores.map((f) => f.id), total)
  const [aviso, setAviso] = useState<string | null>(null)
  const [excluindoLote, setExcluindoLote] = useState(false)
  const selecao = () => (sel.todosFiltro ? { filtro: { q, ativo } } : { ids: Array.from(sel.marcados) })
  function lote(acao: 'ativar' | 'inativar' | 'excluir') {
    setErro(null)
    iniciar(async () => {
      const r = await executarLoteFornecedores(selecao(), acao)
      if (!r.ok) { setErro(r.erro); return }
      setExcluindoLote(false); sel.limpar()
      setAviso(`${r.afetados} fornecedor(es) ${acao === 'ativar' ? 'ativados' : acao === 'inativar' ? 'inativados' : 'excluídos'}.`)
      router.refresh()
    })
  }
  const set = <K extends keyof DadosFornecedor>(k: K, v: DadosFornecedor[K]) => setForm((f) => ({ ...f, [k]: v }))

  function filtrar(novoQ: string, novoAtivo: string) {
    const p = new URLSearchParams()
    if (novoQ) p.set('q', novoQ)
    if (novoAtivo) p.set('ativo', novoAtivo)
    router.push(`/fornecedores${p.size ? `?${p}` : ''}`)
  }

  function abrir(f?: Fornecedor) { setForm(f ? doForn(f) : VAZIO); setErro(null); setModal({ id: f?.id ?? null }) }

  function salvar() {
    if (form.razaoSocial.trim().length < 2) { setErro('Informe o nome do fornecedor'); return }
    setErro(null)
    iniciar(async () => {
      const r = await salvarFornecedor(modal?.id ?? null, form)
      if (r.ok) { setModal(null); router.refresh() } else setErro(r.erro)
    })
  }

  function excluir(f: Fornecedor) {
    if (!confirm(`Excluir o fornecedor "${f.razaoSocial}"? O histórico de estoque continua guardado.`)) return
    iniciar(async () => { const r = await excluirFornecedor(f.id); if (r.ok) router.refresh(); else alert(r.erro) })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <form onSubmit={(e) => { e.preventDefault(); filtrar(busca.trim(), ativo) }} className="relative flex-1 min-w-[12rem] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ, cidade…" className={`${inputCls} pl-9`} aria-label="Buscar fornecedores" />
          </form>
          <select value={ativo} onChange={(e) => filtrar(busca.trim(), e.target.value)} className={`${inputCls} !w-auto`} aria-label="Situação">
            <option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option>
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2"><PlanilhaBotoes recurso="fornecedores" nome="fornecedores" /></div>
          <button onClick={() => abrir()} className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo fornecedor
          </button>
        </div>

        <AvisoLote texto={aviso} onFechar={() => setAviso(null)} />
        <BarraSelecao sel={sel} total={total} itensNaPagina={fornecedores.length}>
          <button type="button" onClick={() => lote('ativar')} disabled={pendente} className={botaoLote}>Ativar</button>
          <button type="button" onClick={() => lote('inativar')} disabled={pendente} className={botaoLote}>Inativar</button>
          <button type="button" onClick={() => { setErro(null); setExcluindoLote(true) }} className={botaoLotePerigo}><Trash2 size={13} /> Excluir</button>
          {erro && !excluindoLote && <span role="alert" className="text-xs text-destructive">{erro}</span>}
        </BarraSelecao>

        {fornecedores.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{q || ativo ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="w-10 px-4 py-3"><CheckSelecao marcado={sel.todosDaPagina || sel.todosFiltro} onChange={sel.alternarTodos} rotulo="Selecionar todos desta página" /></th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="hidden md:table-cell text-left px-4 py-3">CPF/CNPJ</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3">Contato</th>
                  <th className="hidden md:table-cell text-left px-4 py-3">Cidade</th>
                  <th className="hidden sm:table-cell text-right px-4 py-3">Produtos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fornecedores.map((f) => (
                  <tr key={f.id} className={`${f.ativo ? '' : 'opacity-60'} ${sel.marcado(f.id) ? 'bg-primary/5' : ''}`}>
                    <td className="w-10 px-4 py-3"><CheckSelecao marcado={sel.marcado(f.id)} onChange={() => sel.alternar(f.id)} rotulo={`Selecionar ${f.razaoSocial}`} /></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{f.razaoSocial}{!f.ativo && <span className="ml-2 text-xs text-gray-500">(inativo)</span>}</p>
                      {f.nomeFantasia && <p className="text-xs text-gray-500">{f.nomeFantasia}</p>}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-700">{formatarDocumento(f.cpfCnpj) || '—'}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-gray-700">
                      {[f.contato, f.telefone || f.celular, f.email].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-700">{[f.cidade, f.uf].filter(Boolean).join('/') || '—'}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-gray-700">{f._count?.produtos ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => iniciar(async () => { const r = await alternarFornecedor(f.id, !f.ativo); if (r.ok) router.refresh(); else alert(r.erro) })}
                          className="px-2 py-1 text-xs font-semibold text-gray-600 border border-border rounded-lg hover:bg-surface">{f.ativo ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => abrir(f)} aria-label={`Editar ${f.razaoSocial}`} className="p-2 text-gray-500 hover:text-primary"><Pencil size={14} /></button>
                        <button onClick={() => excluir(f)} aria-label={`Excluir ${f.razaoSocial}`} className="p-2 text-gray-500 hover:text-destructive"><Trash2 size={14} /></button>
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

      {excluindoLote && (
        <ModalLote titulo="Excluir fornecedores" qtd={sel.qtd} destrutivo pendente={pendente} erro={erro} onFechar={() => setExcluindoLote(false)} onConfirmar={() => lote('excluir')}>
          <p className="text-destructive">Eles saem da lista e das novas compras. Produtos e histórico de estoque continuam guardados.</p>
        </ModalLote>
      )}

      {modal && (
        <Modal titulo={modal.id ? 'Editar fornecedor' : 'Novo fornecedor'} onFechar={() => setModal(null)} largura="max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <Campo rotulo="Tipo" className="sm:col-span-2">
              <select value={form.tipoPessoa} onChange={(e) => set('tipoPessoa', e.target.value as 'F' | 'J')} className={inputCls}>
                <option value="J">Pessoa jurídica</option><option value="F">Pessoa física</option>
              </select>
            </Campo>
            <Campo rotulo={form.tipoPessoa === 'J' ? 'CNPJ' : 'CPF'} className="sm:col-span-4">
              <input value={form.cpfCnpj} onChange={(e) => set('cpfCnpj', e.target.value)} className={inputCls} inputMode="numeric" />
            </Campo>
            <Campo rotulo={form.tipoPessoa === 'J' ? 'Razão social *' : 'Nome *'} className="sm:col-span-6">
              <input value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} className={inputCls} autoFocus />
            </Campo>
            <Campo rotulo="Nome fantasia" className="sm:col-span-4"><input value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Inscrição estadual" className="sm:col-span-2"><input value={form.inscricaoEstadual} onChange={(e) => set('inscricaoEstadual', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Inscrição municipal" className="sm:col-span-2"><input value={form.inscricaoMunicipal} onChange={(e) => set('inscricaoMunicipal', e.target.value)} className={inputCls} /></Campo>
            {form.tipoPessoa === 'F' && (
              <>
                <Campo rotulo="RG" className="sm:col-span-2"><input value={form.rg} onChange={(e) => set('rg', e.target.value)} className={inputCls} /></Campo>
                <Campo rotulo="Data de nascimento" className="sm:col-span-2"><input type="date" value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} className={inputCls} /></Campo>
              </>
            )}
            <Campo rotulo="Pessoa de contato" className="sm:col-span-2"><input value={form.contato} onChange={(e) => set('contato', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Telefone" className="sm:col-span-2"><input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Celular / WhatsApp" className="sm:col-span-2"><input value={form.celular} onChange={(e) => set('celular', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="E-mail" className="sm:col-span-6"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="CEP" className="sm:col-span-2"><input value={form.cep} onChange={(e) => set('cep', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Logradouro" className="sm:col-span-3"><input value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Número" className="sm:col-span-1"><input value={form.numeroEndereco} onChange={(e) => set('numeroEndereco', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Complemento" className="sm:col-span-2"><input value={form.complemento} onChange={(e) => set('complemento', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Bairro" className="sm:col-span-2"><input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Cidade" className="sm:col-span-1"><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="UF" className="sm:col-span-1"><input value={form.uf} onChange={(e) => set('uf', e.target.value.toUpperCase().slice(0, 2))} className={inputCls} maxLength={2} /></Campo>
            <Campo rotulo="Observações" className="sm:col-span-6"><textarea value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} rows={3} className={inputCls} /></Campo>
          </div>
          {erro && <p role="alert" className="mt-3 text-sm text-destructive">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
            <button onClick={salvar} disabled={pendente} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
              {pendente && <Loader2 size={14} className="animate-spin" />} Salvar
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
