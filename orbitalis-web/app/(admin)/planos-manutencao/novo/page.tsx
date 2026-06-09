import { api } from '@/lib/api'
import { NovoPlanoForm } from './form'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
}
type Tecnico = { id: string; email: string }

export default async function NovoPlanoPage() {
  const [ambientes, tecnicos] = await Promise.all([
    api.get<Ambiente[]>('/ambientes').catch(() => [] as Ambiente[]),
    api.get<Tecnico[]>('/usuarios/tecnicos').catch(() => [] as Tecnico[]),
  ])

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/planos-manutencao" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Planos Preventivos
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Novo Plano Preventivo</h1>
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
            <NovoPlanoForm ambientes={ambientes} tecnicos={tecnicos} />
          )}
        </div>
      </div>
    </div>
  )
}
