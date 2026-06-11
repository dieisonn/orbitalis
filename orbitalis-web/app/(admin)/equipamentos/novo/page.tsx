import { api } from '@/lib/api'
import { NovoEquipamentoForm } from './form'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}

export default async function NovoEquipamentoPage() {
  let ambientes: Ambiente[] = []
  try {
    const res = await api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000')
    ambientes = res.data
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/equipamentos" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Equipamentos
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Novo Equipamento</h1>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {ambientes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                Nenhum ambiente cadastrado.{' '}
                <a href="/ambientes/novo" className="text-primary font-semibold hover:underline">
                  Crie um ambiente primeiro.
                </a>
              </p>
            </div>
          ) : (
            <NovoEquipamentoForm ambientes={ambientes} />
          )}
        </div>
      </div>
    </div>
  )
}
