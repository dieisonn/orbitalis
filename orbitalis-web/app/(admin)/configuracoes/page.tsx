import { api } from '@/lib/api'
import { ConfiguracaoForm } from './form'

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
}

export default async function ConfiguracoesPage() {
  let config: Config = {
    nomeEmpresa: 'Orbitalis', nomeFantasia: null, logoUrl: null,
    corPrimaria: '#0505ad', cnpj: null, telefone: null, endereco: null,
  }
  try {
    config = await api.get<Config>('/configuracao')
  } catch { /* usa padrão */ }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Configurações da Empresa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalize a identidade visual da plataforma — aparece no sidebar, nos PDFs e na tela de login.
        </p>
      </div>
      <div className="bg-white rounded-xl p-6 border border-border">
        <ConfiguracaoForm config={config} />
      </div>
    </div>
  )
}
