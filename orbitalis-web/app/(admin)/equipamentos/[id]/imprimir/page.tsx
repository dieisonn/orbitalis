import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { PrintLabel } from './print-label'

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

export default async function ImprimirQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let equipamento: Equipamento | null = null
  let config: Config = { nomeEmpresa: 'Orbitalis', nomeFantasia: null, logoUrl: null }

  try {
    ;[equipamento, config] = await Promise.all([
      api.get<Equipamento>(`/equipamentos/${id}`),
      api.get<Config>('/configuracao').catch(() => config),
    ])
  } catch {
    notFound()
  }

  if (!equipamento) notFound()

  return <PrintLabel equipamento={equipamento} config={config} />
}
