import { api } from '@/lib/api'
import { ConfiguracaoForm } from './form'

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
}

export default async function ConfiguracoesPage() {
  let config: Config = { nomeEmpresa: 'Orbitalis', nomeFantasia: null, logoUrl: null, corPrimaria: '#0505ad' }
  try {
    config = await api.get<Config>('/configuracao')
  } catch { /* usa padrão */ }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Configurações da Empresa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalize a identidade visual da plataforma — aparece no sidebar, nos PDFs e na tela de login.
        </p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <ConfiguracaoForm config={config} />
      </div>
    </div>
  )
}
