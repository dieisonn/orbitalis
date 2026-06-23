import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { PrintDiagnostico } from './print-diagnostico'

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
}

type Props = { params: Promise<{ id: string; diagId: string }> }

export default async function DiagnosticoPdfPage({ params }: Props) {
  const { diagId } = await params
  try {
    const [diag, config] = await Promise.all([
      api.get<any>(`/diagnosticos-lgmv/${diagId}`),
      api.get<Config>('/configuracao').catch(() => null),
    ])
    return <PrintDiagnostico diag={diag} config={config} />
  } catch {
    notFound()
  }
}
