'use client'

import { useTransition, useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { criarChecklist, atualizarChecklist, type ChecklistItem } from '@/app/(admin)/checklists/actions'

type Props = {
  initialNome?: string
  initialItens?: ChecklistItem[]
  checklistId?: string
}

export function ChecklistEditor({ initialNome = '', initialItens = [], checklistId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState(initialNome)
  const [itens, setItens] = useState<ChecklistItem[]>(initialItens)
  const [novoItem, setNovoItem] = useState('')
  const [novoObrigatorio, setNovoObrigatorio] = useState(false)

  function addItem() {
    const descricao = novoItem.trim()
    if (!descricao) return
    setItens((prev) => [
      ...prev,
      { id: crypto.randomUUID(), descricao, obrigatorio: novoObrigatorio },
    ])
    setNovoItem('')
    setNovoObrigatorio(false)
  }

  function removeItem(id: string) {
    setItens((prev) => prev.filter((i) => i.id !== id))
  }

  function toggleObrigatorio(id: string) {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, obrigatorio: !i.obrigatorio } : i))
    )
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

      {/* Adicionar item */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Itens do Checklist</label>

        <div className="flex gap-2 mb-3">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            placeholder="Descrição do item (Enter para adicionar)"
            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={novoObrigatorio}
              onChange={(e) => setNovoObrigatorio(e.target.checked)}
              className="rounded"
            />
            Obrigatório
          </label>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            title="Adicionar item"
          >
            <Plus size={16} />
          </button>
        </div>

        {itens.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 border border-dashed border-border rounded-xl">
            Nenhum item adicionado ainda
          </p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {itens.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${i !== 0 ? 'border-t border-border' : ''} hover:bg-surface`}
              >
                <GripVertical size={14} className="text-gray-300 shrink-0" />
                <span className="flex-1 text-gray-800">{item.descricao}</span>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.obrigatorio}
                    onChange={() => toggleObrigatorio(item.id)}
                    className="rounded"
                  />
                  Obrig.
                </label>
                {item.obrigatorio && (
                  <span className="text-[9px] font-bold text-destructive uppercase bg-destructive/10 px-1.5 py-0.5 rounded">
                    obrig.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-gray-300 hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {itens.length} item(ns) · Itens obrigatórios bloqueiam conclusão da O.S. se não forem marcados.
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
