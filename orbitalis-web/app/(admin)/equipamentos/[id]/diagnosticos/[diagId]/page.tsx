import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { RelatorioView } from './relatorio-view'

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
}

type Props = { params: Promise<{ id: string; diagId: string }> }

export default async function DiagnosticoPage({ params }: Props) {
  const { id, diagId } = await params

  let diag: any
  let config: Config | null = null
  try {
    ;[diag, config] = await Promise.all([
      api.get<any>(`/diagnosticos-lgmv/${diagId}`),
      api.get<Config>('/configuracao').catch(() => null),
    ])
  } catch {
    notFound()
  }

  const eq = diag.equipamento

  return (
    <div className="max-w-4xl print:max-w-none">
      {/* Breadcrumb — oculto na impressão */}
      <div className="flex items-center gap-2 mb-6 text-sm print:hidden">
        <a href="/equipamentos" className="text-gray-500 hover:text-primary transition-colors">Equipamentos</a>
        <span className="text-gray-300">/</span>
        <a href={`/equipamentos/${id}/historico`} className="text-gray-500 hover:text-primary transition-colors">
          {eq?.nome ?? 'Equipamento'}
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Diagnóstico LGMV</span>
      </div>

      <RelatorioView
        diagId={diagId}
        relatorio={diag.relatorio}
        equipamentoId={id}
        equipamentoNome={eq?.nome ?? '—'}
        equipamentoMarca={eq?.marca ?? ''}
        equipamentoModelo={eq?.modelo ?? null}
        criadoEm={diag.criadoEm}
        dataInspecao={diag.dataInspecao ?? null}
        arquivoIduNome={diag.arquivoIduNome}
        arquivoOduNome={diag.arquivoOduNome}
        config={config}
      />
    </div>
  )
}
