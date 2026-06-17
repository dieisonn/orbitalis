import { api } from '@/lib/api'
import { NovaOsForm } from './form'

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  clienteId: string
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null
  equipamentos: { id: string; nome: string; tipoEquipamento: string }[]
}
type Tecnico = { id: string; email: string; nome: string | null }

export default async function NovaOsPage() {
  const [ambientesRes, tecnicosRes] = await Promise.all([
    api.get<{ data: Ambiente[] }>('/ambientes?perPage=1000').catch(() => ({ data: [] as Ambiente[] })),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
  ])
  const ambientes = ambientesRes.data
  const tecnicos  = tecnicosRes.data

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/ordens-servico" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Ordens de Serviço
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Criar O.S. Manual</h1>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-border p-6">
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
            <NovaOsForm ambientes={ambientes} tecnicos={tecnicos} />
          )}
        </div>
      </div>
    </div>
  )
}
