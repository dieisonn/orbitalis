import { api } from '@/lib/api'
import { PrintOS, type TipoServicoOpcao } from './print-os'
import { notFound } from 'next/navigation'

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
  email?: string | null; site?: string | null; instrucoesOs?: string | null; cidade?: string | null; uf?: string | null
}
type Props = { params: Promise<{ id: string }> }

export default async function OsPdfPage({ params }: Props) {
  const { id } = await params
  try {
    const [os, config, tipos] = await Promise.all([
      api.get<any>(`/ordens-servico/${id}`),
      api.get<Config>('/configuracao').catch(() => null),
      api.get<(TipoServicoOpcao & { ativo?: boolean; entraNoRelatorio?: boolean })[]>('/tipos-servico').catch(() => []),
    ])
    return <PrintOS os={os} config={config} tipos={(Array.isArray(tipos) ? tipos : []).filter((x) => x.ativo !== false && x.entraNoRelatorio !== false)} />
  } catch {
    notFound()
  }
}
