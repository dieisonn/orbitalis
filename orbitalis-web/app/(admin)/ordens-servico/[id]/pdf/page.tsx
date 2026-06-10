import { api } from '@/lib/api'
import { PrintOS } from './print-os'
import { notFound } from 'next/navigation'

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
}
type Props = { params: Promise<{ id: string }> }

export default async function OsPdfPage({ params }: Props) {
  const { id } = await params
  try {
    const [os, config] = await Promise.all([
      api.get<any>(`/ordens-servico/${id}`),
      api.get<Config>('/configuracao').catch(() => null),
    ])
    return <PrintOS os={os} config={config} />
  } catch {
    notFound()
  }
}
