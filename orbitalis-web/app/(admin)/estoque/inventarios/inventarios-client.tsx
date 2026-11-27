'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2, Plus } from 'lucide-react'
import { Modal, Campo, inputCls } from '@/components/ui/modal'
import type { Inventario } from '@/lib/suprimentos'
import { dataHora } from '@/lib/suprimentos'
import { criarInventario } from './actions'

const ROTULO = { aberto: 'Em contagem', concluido: 'Concluído', cancelado: 'Cancelado' } as const
const COR = { aberto: 'bg-amber-50 text-amber-800 border-amber-200', concluido: 'bg-green-50 text-green-800 border-green-200', cancelado: 'bg-gray-100 text-gray-600 border-gray-200' } as const

export function InventariosClient({ lista, categorias }: { lista: Inventario[]; categorias: string[] }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [f, setF] = useState({ titulo: '', categoria: '', localizacao: '', incluirZerados: true, contagemCega: false })

  function criar() {
    setErro(null)
    iniciar(async () => {
      const r = await criarInventario(f)
      if (r.ok) router.push(`/estoque/inventarios/${r.id}`)
      else setErro(r.erro)
    })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <Link href="/estoque" className="text-sm text-gray-600 hover:underline">← Voltar ao estoque</Link>
          <button onClick={() => { setErro(null); setAberto(true) }} className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90">
            <Plus size={14} /> Novo inventário
          </button>
        </div>
        {lista.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            <ClipboardCheck size={28} className="mx-auto mb-2 text-gray-400" aria-hidden="true" />
            Nenhum inventário ainda. Abra um para conferir o estoque de verdade.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((i) => {
              const pct = i.totalItens ? Math.round(((i.itensContados ?? 0) / i.totalItens) * 100) : 0
              return (
                <li key={i.id}>
                  <Link href={`/estoque/inventarios/${i.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">#{i.numero} · {i.titulo}</p>
                      <p className="text-xs text-gray-500">
                        Aberto em {dataHora(i.criadoEm)}{i.filtroCategoria ? ` · ${i.filtroCategoria}` : ''}{i.filtroLocalizacao ? ` · ${i.filtroLocalizacao}` : ''}{i.contagemCega ? ' · contagem cega' : ''}
                      </p>
                    </div>
                    {i.status === 'aberto' && (
                      <div className="w-40" aria-label={`${pct}% contado`}>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-action" style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs text-gray-500 mt-1">{i.itensContados ?? 0} de {i.totalItens ?? 0} contados</p>
                      </div>
                    )}
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${COR[i.status]}`}>{ROTULO[i.status]}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {aberto && (
        <Modal titulo="Novo inventário" onFechar={() => setAberto(false)} largura="max-w-md">
          <div className="space-y-3">
            <Campo rotulo="Título" dica="Opcional. Ex.: Almoxarifado — dezembro"><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={inputCls} autoFocus /></Campo>
            <Campo rotulo="Categoria" dica="Deixe em branco para conferir todos os produtos.">
              <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={inputCls}>
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Local no estoque" dica="Opcional. Igual ao campo “Local” do produto (prateleira, carro…)."><input value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} className={inputCls} /></Campo>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={f.incluirZerados} onChange={(e) => setF({ ...f, incluirZerados: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--color-action)]" />
              <span className="text-sm text-gray-700">Incluir produtos com saldo zero<span className="block text-xs text-gray-500">Podem existir na prateleira sem registro no sistema.</span></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={f.contagemCega} onChange={(e) => setF({ ...f, contagemCega: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--color-action)]" />
              <span className="text-sm text-gray-700">Contagem cega<span className="block text-xs text-gray-500">Esconde o saldo do sistema na tela e na folha, para quem conta não se influenciar.</span></span>
            </label>
          </div>
          {erro && <p role="alert" className="mt-3 text-sm text-destructive">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAberto(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Cancelar</button>
            <button onClick={criar} disabled={pendente} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
              {pendente && <Loader2 size={14} className="animate-spin" />} Abrir inventário
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
