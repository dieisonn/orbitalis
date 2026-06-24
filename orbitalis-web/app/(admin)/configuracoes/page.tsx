import { api } from '@/lib/api'
import { ConfiguracaoForm } from './form'
import { GoogleCalendarCard } from './google-calendar-card'
import { ResponsavelTecnicoCard } from './responsavel-tecnico-card'
import { LgmvRecomputeCard } from './lgmv-recompute-card'

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
  googleConectado?: boolean
  googleEmail?: string | null
  responsavelTecnicoId?: string | null
  responsavelTecnico?: { id: string; nome: string | null; email: string; crea: string | null } | null
}

type Tecnico = { id: string; email: string; nome: string | null; crea: string | null }

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const googleStatus = params.google // 'sucesso' | 'erro' | undefined

  let config: Config = {
    nomeEmpresa: 'Orbitalis', nomeFantasia: null, logoUrl: null,
    corPrimaria: '#0505ad', cnpj: null, telefone: null, endereco: null,
  }
  let tecnicos: Tecnico[] = []
  try {
    [config] = await Promise.all([
      api.get<Config>('/configuracao'),
    ])
    const tecnicosRes = await api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] }))
    tecnicos = tecnicosRes.data
  } catch { /* usa padrão */ }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalize a identidade visual da plataforma e as integrações.
        </p>
      </div>

      {googleStatus === 'sucesso' && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-lg">
          Google Agenda conectado com sucesso.
        </div>
      )}
      {googleStatus === 'erro' && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
          Não foi possível conectar ao Google Agenda. Tente novamente.
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-border">
        <ConfiguracaoForm config={config} />
      </div>

      <GoogleCalendarCard
        conectado={config.googleConectado ?? false}
        email={config.googleEmail ?? null}
      />

      <ResponsavelTecnicoCard
        tecnicos={tecnicos}
        responsavelTecnicoId={config.responsavelTecnicoId ?? null}
        responsavelTecnico={config.responsavelTecnico ?? null}
      />

      <LgmvRecomputeCard />
    </div>
  )
}
