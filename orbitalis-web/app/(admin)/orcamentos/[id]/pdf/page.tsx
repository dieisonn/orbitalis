import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { PrintOrcamento } from './print-orcamento'

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null }
type Props = { params: Promise<{ id: string }> }

export default async function OrcamentoPdfPage({ params }: Props) {
  const { id } = await params
  try {
    const [orc, config] = await Promise.all([
      api.get<any>(`/orcamentos/${id}`),
      api.get<Config>('/configuracao').catch(() => null),
    ])
    return <PrintOrcamento orc={orc} config={config} />
  } catch {
    notFound()
  }
}
