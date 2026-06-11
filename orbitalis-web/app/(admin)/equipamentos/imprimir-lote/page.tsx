import { api } from '@/lib/api'
import { BatchPrintLabels } from './batch-print-labels'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: { nome: string; localizacaoInterna: string; cliente: { razaoSocial: string; nomeFantasia: string | null } }
}

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null }

type Props = { searchParams: Promise<{ ids?: string }> }

export default async function ImprimirLotePage({ searchParams }: Props) {
  const { ids } = await searchParams
  const idList = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  if (idList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-sm">Nenhum equipamento selecionado.</p>
      </div>
    )
  }

  let config: Config = { nomeEmpresa: 'Orbitalis', nomeFantasia: null, logoUrl: null }
  const equipamentos: Equipamento[] = []

  const [configResult, ...equipResults] = await Promise.allSettled([
    api.get<Config>('/configuracao'),
    ...idList.map((id) => api.get<Equipamento>(`/equipamentos/${id}`)),
  ])

  if (configResult.status === 'fulfilled') config = configResult.value as Config
  for (const r of equipResults) {
    if (r.status === 'fulfilled') equipamentos.push(r.value as Equipamento)
  }

  const empresaNome = config.nomeFantasia ?? config.nomeEmpresa

  return <BatchPrintLabels equipamentos={equipamentos} config={config} empresaNome={empresaNome} />
}
