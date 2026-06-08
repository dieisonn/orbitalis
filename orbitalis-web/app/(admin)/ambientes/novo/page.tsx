import { api } from '@/lib/api'
import { NovoAmbienteForm } from './form'

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export default async function NovoAmbientePage() {
  let clientes: Cliente[] = []
  try {
    clientes = await api.get<Cliente[]>('/clientes')
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/ambientes" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Ambientes
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Novo Ambiente</h1>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {clientes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                Nenhum cliente cadastrado.{' '}
                <a href="/clientes/novo" className="text-primary font-semibold hover:underline">
                  Crie um cliente primeiro.
                </a>
              </p>
            </div>
          ) : (
            <NovoAmbienteForm clientes={clientes} />
          )}
        </div>
      </div>
    </div>
  )
}
