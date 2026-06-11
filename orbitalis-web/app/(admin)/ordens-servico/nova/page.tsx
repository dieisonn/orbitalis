import { api } from '@/lib/api'
import { NovaOsForm } from './form'

type Equipamento = {
  id: string
  nome: string
  tipoEquipamento: string
  marca: string
  ambienteId: string
  ambiente: {
    id: string
    nome: string
    localizacaoInterna: string
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  }
}
type Tecnico = { id: string; email: string }

export default async function NovaOsPage() {
  const [equipamentosRes, tecnicosRes] = await Promise.all([
    api.get<{ data: Equipamento[] }>('/equipamentos?perPage=1000').catch(() => ({ data: [] as Equipamento[] })),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
  ])
  const equipamentos = equipamentosRes.data
  const tecnicos = tecnicosRes.data

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/ordens-servico" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Ordens de Serviço
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-primary">Criar O.S. Manual</h1>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {equipamentos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                Nenhum equipamento cadastrado.{' '}
                <a href="/equipamentos/novo" className="text-primary font-semibold hover:underline">
                  Crie um equipamento primeiro.
                </a>
              </p>
            </div>
          ) : (
            <NovaOsForm equipamentos={equipamentos} tecnicos={tecnicos} />
          )}
        </div>
      </div>
    </div>
  )
}
