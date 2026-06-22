import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { PrintPMOC } from './print-pmoc'

type Props = { params: Promise<{ id: string }> }

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
  responsavelTecnico?: { id: string; nome: string | null; email: string; crea: string | null } | null
} | null

export default async function PmocPage({ params }: Props) {
  const { id } = await params

  try {
    const [plano, config] = await Promise.all([
      api.get<Parameters<typeof PrintPMOC>[0]['plano']>(`/planos-manutencao/${id}`),
      api.get<Exclude<Config, null>>(`/configuracao`).catch(() => null),
    ])
    return <PrintPMOC plano={plano} config={config} />
  } catch {
    notFound()
  }
}
