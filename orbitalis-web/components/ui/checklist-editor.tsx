'use client'

import { useTransition, useState } from 'react'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'
import { criarChecklist, atualizarChecklist, type ChecklistItem } from '@/app/(admin)/checklists/actions'

type TipoItem = 'texto' | 'numero' | 'escolha_unica' | 'multipla_escolha'

const TIPOS: { value: TipoItem; label: string }[] = [
  { value: 'texto',             label: 'Texto' },
  { value: 'numero',            label: 'Número' },
  { value: 'escolha_unica',     label: 'Escolha única' },
  { value: 'multipla_escolha',  label: 'Múltipla escolha' },
]

type Props = {
  initialNome?: string
  initialItens?: ChecklistItem[]
  checklistId?: string
}

export function ChecklistEditor({ initialNome = '', initialItens = [], checklistId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState(initialNome)
  const [itens, setItens] = useState<ChecklistItem[]>(
    initialItens.map((i) => ({ tipo: 'texto' as TipoItem, ...i }))
  )

  // estado do novo item a ser adicionado
  const [novoDescricao, setNovoDescricao]     = useState('')
  const [novoObrigatorio, setNovoObrigatorio] = useState(false)
  const [novoTipo, setNovoTipo]               = useState<TipoItem>('texto')
  const [novoUnidade, setNovoUnidade]         = useState('')
  const [novaOpcao, setNovaOpcao]             = useState('')
  const [novasOpcoes, setNovasOpcoes]         = useState<string[]>([])

  function addOpcao() {
    const o = novaOpcao.trim()
    if (!o || novasOpcoes.includes(o)) return
    setNovasOpcoes((prev) => [...prev, o])
    setNovaOpcao('')
  }

  function removeNovaOpcao(o: string) {
    setNovasOpcoes((prev) => prev.filter((x) => x !== o))
  }

  function resetNovoItem() {
    setNovoDescricao('')
    setNovoObrigatorio(false)
    setNovoTipo('texto')
    setNovoUnidade('')
    setNovaOpcao('')
    setNovasOpcoes([])
  }

  function addItem() {
    const descricao = novoDescricao.trim()
    if (!descricao) return
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      descricao,
      obrigatorio: novoObrigatorio,
      tipo: novoTipo,
      unidade: novoTipo === 'numero' ? novoUnidade.trim() || undefined : undefined,
      opcoes: (novoTipo === 'escolha_unica' || novoTipo === 'multipla_escolha')
        ? novasOpcoes.length > 0 ? novasOpcoes : undefined
        : undefined,
    }
    setItens((prev) => [...prev, item])
    resetNovoItem()
  }

  function removeItem(id: string) {
    setItens((prev) => prev.filter((i) => i.id !== id))
  }

  function toggleObrigatorio(id: string) {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, obrigatorio: !i.obrigatorio } : i)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Informe o nome do checklist'); return }
    if (itens.length === 0) { setError('Adicione ao menos um item'); return }
    setError(null)
    startTransition(async () => {
      try {
        if (checklistId) {
          await atualizarChecklist(checklistId, nome.trim(), itens)
        } else {
          await criarChecklist(nome.trim(), itens)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  const precisaOpcoes = novoTipo === 'escolha_unica' || novoTipo === 'multipla_escolha'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Checklist <span className="text-destructive">*</span>
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Preventiva Mensal Split"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Adicionar novo item */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Item</label>
        <div className="border border-border rounded-xl p-4 space-y-3 bg-surface">

          {/* Linha 1 — descrição + tipo */}
          <div className="flex gap-2">
            <input
              value={novoDescricao}
              onChange={(e) => setNovoDescricao(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
              placeholder="Descrição do item…"
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={novoTipo}
              onChange={(e) => { setNovoTipo(e.target.value as TipoItem); setNovasOpcoes([]) }}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Linha 2 — unidade (numero) ou opções (escolha) */}
          {novoTipo === 'numero' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Unidade de medida:</span>
              <input
                value={novoUnidade}
                onChange={(e) => setNovoUnidade(e.target.value)}
                placeholder="ex: °C, bar, A, %, ppm…"
                className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {precisaOpcoes && (
            <div className="space-y-2">
              <span className="text-xs text-gray-500">Opções de resposta:</span>
              <div className="flex gap-2">
                <input
                  value={novaOpcao}
                  onChange={(e) => setNovaOpcao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOpcao() } }}
                  placeholder="Digite uma opção e pressione Enter…"
                  className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="button" onClick={addOpcao} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20">
                  + Opção
                </button>
              </div>
              {novasOpcoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {novasOpcoes.map((o) => (
                    <span key={o} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {o}
                      <button type="button" onClick={() => removeNovaOpcao(o)}>
                        <X size={10} className="hover:text-destructive" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linha 3 — obrigatório + botão adicionar */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={novoObrigatorio}
                onChange={(e) => setNovoObrigatorio(e.target.checked)}
                className="rounded"
              />
              Item obrigatório
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Itens do Checklist ({itens.length})
        </label>

        {itens.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 border border-dashed border-border rounded-xl">
            Nenhum item adicionado ainda
          </p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {itens.map((item, i) => {
              const tipoDef = TIPOS.find((t) => t.value === (item.tipo ?? 'texto'))
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${i !== 0 ? 'border-t border-border' : ''} hover:bg-surface`}
                >
                  <GripVertical size={14} className="text-gray-300 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm">{item.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                        {tipoDef?.label ?? 'Texto'}
                      </span>
                      {item.tipo === 'numero' && item.unidade && (
                        <span className="text-[10px] text-gray-400">{item.unidade}</span>
                      )}
                      {(item.tipo === 'escolha_unica' || item.tipo === 'multipla_escolha') && item.opcoes && item.opcoes.length > 0 && (
                        <span className="text-[10px] text-gray-400">{item.opcoes.length} opção(ões)</span>
                      )}
                      {item.obrigatorio && (
                        <span className="text-[9px] font-bold text-destructive uppercase bg-destructive/10 px-1.5 py-0.5 rounded">
                          obrig.
                        </span>
                      )}
                    </div>
                    {(item.tipo === 'escolha_unica' || item.tipo === 'multipla_escolha') && item.opcoes && item.opcoes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.opcoes.map((o) => (
                          <span key={o} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={item.obrigatorio}
                      onChange={() => toggleObrigatorio(item.id)}
                      className="rounded"
                    />
                    Obrig.
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-300 hover:text-destructive transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          Itens obrigatórios bloqueiam conclusão da O.S. se não forem respondidos.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/checklists"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando…' : checklistId ? 'Salvar Alterações' : 'Criar Checklist'}
        </button>
      </div>
    </form>
  )
}
