import { api } from '@/lib/api'
import type { Inventario } from '@/lib/suprimentos'
import { InventariosClient } from './inventarios-client'

export default async function InventariosPage() {
  const [lista, categorias] = await Promise.all([
    api.get<Inventario[]>('/inventarios').catch(() => [] as Inventario[]),
    api.get<string[]>('/produtos/categorias').catch(() => [] as string[]),
  ])
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Inventário</h1>
        <p className="text-gray-500 text-sm mt-1">Conferência física do estoque: gere a folha de contagem, confira item a item e, ao fechar, as diferenças viram ajustes no estoque com histórico.</p>
      </div>
      <InventariosClient lista={lista} categorias={categorias} />
    </div>
  )
}
