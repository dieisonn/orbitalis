'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { ChecklistSelect } from '@/components/ui/checklist-select'
import { TIPO_OS_LABEL, type ModeloResumo, type TipoOs } from '@/lib/checklist'
import { ClienteSelect } from '@/components/ui/cliente-select'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }
type Ambiente = { id: string; nome: string; clienteId: string }
type TipoServico = { id: string; sigla: string; nome: string; corHex: string }
type ItemRow = { descricao: string; quantidade: string; unidade: string; precoUnitario: string; categoria: 'servico' | 'peca' }

const EMPTY_ITEM: ItemRow = { descricao: '', quantidade: '1', unidade: 'un', precoUnitario: '', categoria: 'servico' }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function NovoOrcamentoForm({
  clientes, ambientes, tiposServico, modelos,
}: {
  clientes: Cliente[]
  ambientes: Ambiente[]
  tiposServico: TipoServico[]
  modelos: ModeloResumo[]
}) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [validadeDias, setValidadeDias] = useState('30')
  const [ambienteId, setAmbienteId] = useState('')
  const [tipoOs, setTipoOs] = useState<TipoOs>('corretiva')
  const [tipoServicoId, setTipoServicoId] = useState('')
  const [modeloChecklistId, setModeloChecklistId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ItemRow[]>([{ ...EMPTY_ITEM }])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const ambientesDoCliente = ambientes.filter((a) => a.clienteId === clienteId)

  function addItem() { setItens((p) => [...p, { ...EMPTY_ITEM }]) }
  function removeItem(i: number) { setItens((p) => p.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof ItemRow, val: string) {
    setItens((p) => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  const total = itens.reduce((acc, it) => {
    const q = parseFloat(it.quantidade) || 0
    const p = parseFloat(it.precoUnitario) || 0
    return acc + q * p
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!clienteId) { setErro('Selecione um cliente'); return }
    if (itens.some((it) => !it.descricao || !it.precoUnitario)) {
      setErro('Preencha descrição e preço de todos os itens'); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo, clienteId,
          ambienteId: ambienteId || undefined,
          tipoOs,
          tipoServicoId: tipoServicoId || undefined,
          modeloChecklistId: modeloChecklistId || undefined,
          validadeDias: parseInt(validadeDias) || 30,
          observacoes: observacoes || undefined,
          itens: itens.map((it) => ({
            descricao: it.descricao,
            unidade: it.unidade,
            quantidade: parseFloat(it.quantidade) || 1,
            precoUnitario: parseFloat(it.precoUnitario),
            categoria: it.categoria,
          })),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Erro ao criar'); }
      const orc = await res.json()
      router.push(`/orcamentos/${orc.id}`)
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Informações gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Título da proposta *</label>
            <input
              value={titulo} onChange={(e) => setTitulo(e.target.value)} required
              placeholder="Ex: Manutenção preventiva semestral — Sede"
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cliente *</label>
            <ClienteSelect clientes={clientes} value={clienteId} required ariaLabel="Cliente"
              onChange={(id) => { setClienteId(id); setAmbienteId('') }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Validade (dias)</label>
            <input
              type="number" min="1" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea
              value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3}
              placeholder="Condições comerciais, prazo de execução, garantias..."
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Execução: como a O.S. nasce quando o cliente aprovar */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Execução do serviço</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Quando o cliente aprovar, uma O.S. é criada automaticamente com estes dados (você faz a triagem depois).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ambiente</label>
            <select
              value={ambienteId} onChange={(e) => setAmbienteId(e.target.value)} disabled={!clienteId}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              <option value="">{clienteId ? 'Definir na aprovação' : 'Selecione o cliente primeiro'}</option>
              {ambientesDoCliente.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de manutenção</label>
            <select
              value={tipoOs} onChange={(e) => setTipoOs(e.target.value as TipoOs)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(Object.keys(TIPO_OS_LABEL) as TipoOs[]).map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de serviço</label>
            <select
              value={tipoServicoId} onChange={(e) => setTipoServicoId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Não definido</option>
              {tiposServico.map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Checklist da O.S.</label>
            <ChecklistSelect
              modelos={modelos}
              tipo={tipoOs}
              tipoServicoId={tipoServicoId || null}
              value={modeloChecklistId}
              onChange={setModeloChecklistId}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Itens da proposta</h2>
          <button type="button" onClick={addItem}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={13} /> Adicionar item
          </button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:grid">
            <div className="col-span-4">Descrição</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-1">Qtd</div>
            <div className="col-span-1">Un.</div>
            <div className="col-span-2">Preço unit.</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {itens.map((item, i) => {
            const subtotal = (parseFloat(item.quantidade) || 0) * (parseFloat(item.precoUnitario) || 0)
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={item.descricao} onChange={(e) => updateItem(i, 'descricao', e.target.value)}
                  placeholder="Descrição do serviço ou produto" aria-label={`Descrição do item ${i + 1}`}
                  className="col-span-12 md:col-span-4 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <select
                  aria-label={`Categoria do item ${i + 1}`}
                  value={item.categoria} onChange={(e) => updateItem(i, 'categoria', e.target.value)}
                  className="col-span-4 md:col-span-2 px-2 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="servico">Serviço</option>
                  <option value="peca">Peça</option>
                </select>
                <input
                  type="number" min="0.001" step="0.001" aria-label={`Quantidade do item ${i + 1}`}
                  value={item.quantidade} onChange={(e) => updateItem(i, 'quantidade', e.target.value)}
                  className="col-span-4 md:col-span-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  aria-label={`Unidade do item ${i + 1}`}
                  value={item.unidade} onChange={(e) => updateItem(i, 'unidade', e.target.value)}
                  className="col-span-4 md:col-span-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number" min="0" step="0.01" placeholder="0,00" aria-label={`Preço unitário do item ${i + 1}`}
                  value={item.precoUnitario} onChange={(e) => updateItem(i, 'precoUnitario', e.target.value)}
                  className="col-span-4 md:col-span-2 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-1">
                  <span className="text-xs text-gray-500 hidden md:block">{fmtBRL(subtotal)}</span>
                  {itens.length > 1 && (
                    <button type="button" aria-label={`Remover item ${i + 1}`} onClick={() => removeItem(i)} className="p-1 text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <div className="text-right">
            <p className="text-xs text-gray-500">Total da proposta</p>
            <p className="text-lg font-bold text-gray-900">{fmtBRL(total)}</p>
          </div>
        </div>
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar rascunho'}
        </button>
      </div>
    </form>
  )
}
