import { api } from '@/lib/api'
import { AbrirChamadoForm } from './form'

type Ambiente = { id: string; nome: string; localizacaoInterna: string }
type Perfil   = { ambientes: Ambiente[] }

// searchParams é um Server Component prop — sem useSearchParams, sem Suspense
export default async function AbrirChamadoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  let ambientes: Ambiente[] = []
  try {
    const perfil = await api.get<Perfil>('/clientes/meu-perfil')
    ambientes = perfil.ambientes
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Abrir Chamado Corretivo</h1>
        <p className="text-gray-500 text-sm mt-1">Para urgências e falhas identificadas em campo</p>
      </div>
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <AbrirChamadoForm ambientes={ambientes} erro={erro} />
        </div>
      </div>
    </div>
  )
}
