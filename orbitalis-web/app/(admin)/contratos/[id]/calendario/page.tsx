import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { CalendarioContrato, type DadosCalendario, type Config } from './calendario-contrato'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ano?: string }> }

// Calendário anual do contrato (PDF para entregar ao cliente). Só existe para contratos.
export default async function CalendarioContratoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { ano } = await searchParams
  const anoNum = /^\d{4}$/.test(ano ?? '') ? Number(ano) : undefined
  let dados: DadosCalendario
  let config: Config
  try {
    ;[dados, config] = await Promise.all([
      api.get<DadosCalendario>(`/contratos/${id}/calendario${anoNum ? `?ano=${anoNum}` : ''}`),
      api.get<Config>('/configuracao').catch(() => null),
    ])
  } catch {
    notFound()
  }
  return <CalendarioContrato dados={dados} config={config} />
}
