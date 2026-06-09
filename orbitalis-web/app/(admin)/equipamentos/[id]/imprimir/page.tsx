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

export default async function ImprimirQrPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let equipamento: Equipamento | null = null
  try {
    equipamento = await api.get<Equipamento>(`/equipamentos/${id}`)
  } catch {
    notFound()
  }

  if (!equipamento) notFound()

  return <PrintLabel equipamento={equipamento} />
}
