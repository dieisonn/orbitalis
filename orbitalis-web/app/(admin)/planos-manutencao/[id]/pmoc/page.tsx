import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { PrintPMOC } from './print-pmoc'

type Props = { params: Promise<{ id: string }> }

export default async function PmocPage({ params }: Props) {
  const { id } = await params

  let plano: Parameters<typeof PrintPMOC>[0]['plano']
  let config: Parameters<typeof PrintPMOC>[0]['config']

  try {
    ;[plano, config] = await Promise.all([
      api.get(`/planos-manutencao/${id}`),
      api.get(`/configuracao`).catch(() => null),
    ])
  } catch {
    notFound()
  }

  return <PrintPMOC plano={plano} config={config} />
}
