'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { PlanilhaBotoes } from '@/components/ui/planilha-botoes'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { brl, UNIDADES, type ServicoCatalogo } from '@/lib/suprimentos'
import { salvarServico, excluirServico, alternarServico, type DadosServico } from './actions'

type Tipo = { id: string; sigla: string; nome: string }
const VAZIO: DadosServico = { nome: '', descricao: '', unidade: 'un', valor: 0, tipoServicoId: '', codigo: '', valorCusto: 0, comissaoPercentual: 0, atividadeServico: '', nbs: '' }

export function ServicosCatalogoClient({ servicos, tipos, q, ativo }: { servicos: ServicoCatalogo[]; tipos: Tipo[]; q: string; ativo: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [busca, setBusca] = useState(q)
  const [modal, setModal] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState<DadosServico>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  function filtrar(novoQ: string, novoAtivo: string) {
    const p = new URLSearchParams()
    if (novoQ) p.set('q', novoQ)
    if (novoAtivo) p.set('ativo', novoAtivo)
    router.push(`/catalogo-servicos${p.size ? `?${p}` : ''}`)
  }
  function abrir(s?: ServicoCatalogo) {
    setForm(s ? { nome: s.nome, descricao: s.descricao ?? '', unidade: s.unidade, valor: Number(s.valor), tipoServicoId: s.tipoServicoId ?? '', codigo: s.codigo ?? '', valorCusto: Number(s.valorCusto ?? 0), comissaoPercentual: Number(s.comissaoPercentual ?? 0), atividadeServico: s.atividadeServico ?? '', nbs: s.nbs ?? '' } : VAZIO)
    setErro(null); setModal({ id: s?.id ?? null })
  }
  function salvar() {
    if (form.nome.trim().length < 2) { setErro('Informe o nome do serviço'); return }
    setErro(null)
    iniciar(async () => {
      const r = await salvarServico(modal?.id ?? null, form)
      if (r.ok) { setModal(null); router.refresh() } else setErro(r.erro)
    })
  }
  function excluir(s: ServicoCatalogo) {
    if (!confirm(`Excluir o serviço "${s.nome}"?`)) return
    iniciar(async () => { const r = await excluirServico(s.id); if (r.ok) router.refresh(); else alert(r.erro) })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <form onSubmit={(e) => { e.preventDefault(); filtrar(busca.trim(), ativo) }} className="relative flex-1 min-w-[12rem] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço…" className={`${inputCls} pl-9`} aria-label="Buscar serviços" />
          </form>
          <select value={ativo} onChange={(e) => filtrar(busca.trim(), e.target.value)} className={`${inputCls} !w-auto`} aria-label="Situação">
            <option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option>
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2"><PlanilhaBotoes recurso="catalogo-servicos" nome="serviços" /></div>
          <button onClick={() => abrir()} className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo serviço
          </button>
        </div>

        {servicos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{q || ativo ? 'Nenhum serviço encontrado.' : 'Nenhum serviço cadastrado ainda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="hidden md:table-cell text-left px-4 py-3">Tipo na agenda</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servicos.map((s) => {
                  const tipo = tipos.find((t) => t.id === s.tipoServicoId)
                  return (
                    <tr key={s.id} className={s.ativo ? '' : 'opacity-60'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.nome}{!s.ativo && <span className="ml-2 text-xs text-gray-500">(inativo)</span>}</p>
                        <p className="text-xs text-gray-500">{s.codigo ? `Cód. ${s.codigo}` : `#${s.numero}`}{s.descricao ? ` · ${s.descricao.slice(0, 80)}` : ''}</p>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-700">{tipo ? `${tipo.sigla} — ${tipo.nome}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{brl(s.valor)} <span className="text-xs text-gray-500 font-normal">/ {s.unidade}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => iniciar(async () => { const r = await alternarServico(s.id, !s.ativo); if (r.ok) router.refresh(); else alert(r.erro) })}
                            className="hidden sm:inline px-2 py-1 text-xs font-semibold text-gray-600 border border-border rounded-lg hover:bg-surface">{s.ativo ? 'Inativar' : 'Ativar'}</button>
                          <button onClick={() => abrir(s)} aria-label={`Editar ${s.nome}`} className="p-2 text-gray-500 hover:text-primary"><Pencil size={14} /></button>
                          <button onClick={() => excluir(s)} aria-label={`Excluir ${s.nome}`} className="p-2 text-gray-500 hover:text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal titulo={modal.id ? 'Editar serviço' : 'Novo serviço'} onFechar={() => setModal(null)} largura="max-w-lg">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <Campo rotulo="Nome *" className="sm:col-span-6"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} autoFocus /></Campo>
            <Campo rotulo="Código" className="sm:col-span-3" dica="Usado para atualizar o serviço ao importar planilha."><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} maxLength={60} /></Campo>
            <Campo rotulo="Atividade de serviço" className="sm:col-span-3"><input value={form.atividadeServico} onChange={(e) => setForm({ ...form, atividadeServico: e.target.value })} className={inputCls} maxLength={120} /></Campo>
            <Campo rotulo="Valor de custo (R$)" className="sm:col-span-2"><input type="number" min="0" step="0.01" value={form.valorCusto || ''} onChange={(e) => setForm({ ...form, valorCusto: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Campo>
            <Campo rotulo="Comissão (%)" className="sm:col-span-2"><input type="number" min="0" max="100" step="0.01" value={form.comissaoPercentual || ''} onChange={(e) => setForm({ ...form, comissaoPercentual: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Campo>
            <Campo rotulo="NBS" className="sm:col-span-2"><input value={form.nbs} onChange={(e) => setForm({ ...form, nbs: e.target.value })} className={inputCls} maxLength={20} /></Campo>
            <Campo rotulo="Valor de venda (R$)" className="sm:col-span-3"><input type="number" min="0" step="0.01" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Campo>
            <Campo rotulo="Unidade" className="sm:col-span-3">
              <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className={inputCls}>
                {(UNIDADES.includes(form.unidade) ? UNIDADES : [form.unidade, ...UNIDADES]).map((u) => <option key={u}>{u}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Tipo de serviço na agenda" className="sm:col-span-6" dica="Usado ao gerar a O.S. de um orçamento aprovado (cor, sigla e duração).">
              <select value={form.tipoServicoId} onChange={(e) => setForm({ ...form, tipoServicoId: e.target.value })} className={inputCls}>
                <option value="">Nenhum</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Descrição" className="sm:col-span-6"><textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className={inputCls} /></Campo>
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
