import { api } from '@/lib/api'
import { ServicosClient } from './servicos-client'

export type TipoServico = {
  id: string
  sigla: string
  nome: string
  corHex: string
  duracaoMinutos: number
  valorPadrao: number | null
  ativo: boolean
  sistema: boolean
}

export default async function ServicosPage() {
  const tipos = await api.get<TipoServico[]>('/tipos-servico').catch(() => [] as TipoServico[])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tipos de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">
            Nomenclaturas, cores, duração e valores padrão usados nas Ordens de Serviço e na Agenda. A duração define quanto tempo o evento ocupa na agenda (ex.: Visita Técnica = 1h, Limpeza Química = 2h).
          </p>
        </div>
      </div>
      <ServicosClient tipos={tipos} />
    </div>
  )
}
