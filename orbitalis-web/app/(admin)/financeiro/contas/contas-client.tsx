'use client'
import { useState, useTransition } from 'react'
import { Landmark, Pencil, Plus, Tags } from 'lucide-react'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import { brl, TIPO_CONTA_LABEL, type Categoria, type Conta } from '@/lib/financeiro'
import { salvarCategoria, salvarConta } from '../actions'

export function ContasClient({ contas, categorias }: { contas: Conta[]; categorias: Categoria[] }) {
  const [conta, setConta] = useState<Conta | 'nova' | null>(null)
  const [cat, setCat] = useState<{ editar?: Categoria; tipo: 'receita' | 'despesa' } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  function alternar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null)
    iniciar(async () => { const r = await fn(); if (!r.ok) setErro(r.erro ?? 'Não foi possível concluir') })
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section aria-labelledby="t-contas" className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 id="t-contas" className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Landmark size={15} aria-hidden /> Contas (caixa e bancos)</h2>
          <button type="button" onClick={() => setConta('nova')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Plus size={13} /> Nova conta</button>
        </div>
        <ul className="divide-y divide-border">
          {contas.map((c) => (
            <li key={c.id} className={`flex items-center gap-3 py-3 ${c.ativa ? '' : 'opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.nome}{!c.ativa && <span className="ml-2 text-[11px] text-gray-500">(inativa)</span>}</p>
                <p className="text-xs text-gray-500">{TIPO_CONTA_LABEL[c.tipo] ?? c.tipo} · saldo inicial {brl(c.saldoInicial)}</p>
              </div>
              <span className={`text-sm font-semibold ${c.saldoAtual < 0 ? 'text-red-700' : 'text-gray-900'}`}>{brl(c.saldoAtual)}</span>
              <button type="button" onClick={() => setConta(c)} aria-label={`Editar conta ${c.nome}`} className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-surface"><Pencil size={14} /></button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">O saldo atual é o saldo inicial mais tudo que foi recebido, menos tudo que foi pago nessa conta.</p>
      </section>

      <section aria-labelledby="t-cat" className="bg-white rounded-xl border border-border p-5">
        <h2 id="t-cat" className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><Tags size={15} aria-hidden /> Categorias</h2>
        {(['receita', 'despesa'] as const).map((tipo) => (
          <div key={tipo} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tipo === 'receita' ? 'Receitas' : 'Despesas'}</h3>
              <button type="button" onClick={() => setCat({ tipo })} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus size={12} /> Nova</button>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {categorias.filter((c) => c.tipo === tipo).map((c) => (
                <li key={c.id} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs ${c.ativa ? 'border-border text-gray-800' : 'border-dashed border-gray-300 text-gray-400 line-through'}`}>
                  {c.nome}
                  <button type="button" onClick={() => setCat({ editar: c, tipo })} aria-label={`Renomear ${c.nome}`} className="p-1 text-gray-400 hover:text-primary"><Pencil size={11} /></button>
                  <button type="button" disabled={pendente} onClick={() => alternar(() => salvarCategoria(c.id, { ativa: !c.ativa }))} className="px-1.5 text-[11px] text-gray-500 hover:text-gray-900">{c.ativa ? 'ocultar' : 'reativar'}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {erro && <p role="alert" className="text-sm text-red-700 mt-3">{erro}</p>}
      </section>

      {conta && <FormConta conta={conta === 'nova' ? null : conta} onFechar={() => setConta(null)} />}
      {cat && <FormCategoria editar={cat.editar} tipo={cat.tipo} onFechar={() => setCat(null)} />}
    </div>
  )
}

function FormConta({ conta, onFechar }: { conta: Conta | null; onFechar: () => void }) {
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [tipo, setTipo] = useState(conta?.tipo ?? 'banco')
  const [saldo, setSaldo] = useState(String(conta?.saldoInicial ?? 0))
  const [ativa, setAtiva] = useState(conta?.ativa ?? true)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(null)
    const v = parseFloat(saldo.replace(',', '.')) || 0
    iniciar(async () => {
      const r = await salvarConta(conta?.id ?? null, { nome, tipo, saldoInicial: v, ...(conta ? { ativa } : {}) })
      if (!r.ok) { setErro(r.erro); return }
      onFechar()
    })
  }
  return (
    <Modal titulo={conta ? 'Editar conta' : 'Nova conta'} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Nome *"><input required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Ex.: Banco do Brasil, Caixa da loja" /></Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Tipo"><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>{Object.entries(TIPO_CONTA_LABEL).map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select></Campo>
          <Campo rotulo="Saldo inicial" dica="Quanto havia na conta quando você começou a usar o Orbitalis."><input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} className={inputCls} /></Campo>
        </div>
        {conta && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Conta ativa</label>}
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button disabled={pendente} className="px-5 py-2 bg-action text-white text-sm font-medium rounded-lg disabled:opacity-50">{pendente ? 'Salvando…' : 'Salvar'}</button></div>
      </form>
    </Modal>
  )
}

function FormCategoria({ editar, tipo, onFechar }: { editar?: Categoria; tipo: 'receita' | 'despesa'; onFechar: () => void }) {
  const [nome, setNome] = useState(editar?.nome ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(null)
    iniciar(async () => {
      const r = await salvarCategoria(editar?.id ?? null, editar ? { nome } : { nome, tipo })
      if (!r.ok) { setErro(r.erro); return }
      onFechar()
    })
  }
  return (
    <Modal titulo={editar ? 'Renomear categoria' : `Nova categoria de ${tipo === 'receita' ? 'receita' : 'despesa'}`} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Nome *"><input required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} /></Campo>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button disabled={pendente} className="px-5 py-2 bg-action text-white text-sm font-medium rounded-lg disabled:opacity-50">{pendente ? 'Salvando…' : 'Salvar'}</button></div>
      </form>
    </Modal>
  )
}
