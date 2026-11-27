import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { InventarioDetalhe, Produto } from '@/lib/suprimentos'
import { ContagemClient } from './contagem-client'

export default async function InventarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inv = await api.get<InventarioDetalhe>(`/inventarios/${id}`).catch(() => null)
  if (!inv) notFound()
  // custo para estimar o valor das diferenças
  const produtos = await api.get<Produto[]>('/produtos').catch(() => [] as Produto[])
  const custos = Object.fromEntries(produtos.map((p) => [p.id, Number(p.precoCusto)]))
  return <ContagemClient inv={inv} custos={custos} />
}
