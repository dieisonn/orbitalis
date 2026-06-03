import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { Building2, Cpu } from 'lucide-react'

type OsResumo = {
  id: string
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  origem: string
  dataAgendamento: string
}

type Equipamento = { id: string; nome: string; codigoQr: string; tipoEquipamento: string }

type Ambiente = {
  id: string
  nome: string
  metrosQuadrados: number
  capacidadeTermica: string
  localizacaoInterna: string
  equipamentos: Equipamento[]
  ordensServico: OsResumo[]
}

type Perfil = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  ambientes: Ambiente[]
}

export default async function MeusAmbientesPage() {
  let perfil: Perfil | null = null
  try {
    perfil = await api.get<Perfil>('/clientes/meu-perfil')
  } catch {
    // API indisponível
  }

  if (!perfil) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Não foi possível carregar seu perfil.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">
          {perfil.nomeFantasia ?? perfil.razaoSocial}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {perfil.ambientes.length} ambiente(s) monitorado(s)
        </p>
      </div>

      <div className="grid gap-6">
        {perfil.ambientes.map((amb) => (
          <div key={amb.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Cabeçalho do ambiente */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-primary" />
                <div>
                  <p className="font-semibold text-gray-900">{amb.nome}</p>
                  <p className="text-xs text-gray-400">{amb.localizacaoInterna}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{Number(amb.metrosQuadrados).toFixed(0)} m²</span>
                <span>{amb.capacidadeTermica}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Equipamentos */}
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Equipamentos ({amb.equipamentos.length})
                </p>
                {amb.equipamentos.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum equipamento</p>
                ) : (
                  <ul className="space-y-2">
                    {amb.equipamentos.map((eq) => (
                      <li key={eq.id} className="flex items-center gap-2 text-sm">
                        <Cpu size={13} className="text-primary/40 shrink-0" />
                        <span className="text-gray-700">{eq.nome}</span>
                        <span className="ml-auto font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {eq.codigoQr}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Últimas O.S. */}
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Últimas Ordens de Serviço
                </p>
                {amb.ordensServico.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma O.S. registrada</p>
                ) : (
                  <ul className="space-y-2">
                    {amb.ordensServico.map((os) => (
                      <li key={os.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(os.dataAgendamento).toLocaleDateString('pt-BR')}
                        </span>
                        <StatusBadge status={os.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
