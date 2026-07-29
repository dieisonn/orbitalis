import { AprovarOrcamento } from './aprovar'

type Props = { params: Promise<{ token: string }> }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export default async function OrcamentoPublicoPage({ params }: Props) {
  const { token } = await params

  let orc: any = null
  try {
    const res = await fetch(`${BASE}/orcamentos/publico/${token}`, { cache: 'no-store' })
    if (res.ok) orc = await res.json()
  } catch {}

  if (!orc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Proposta não encontrada</p>
          <p className="text-gray-500">Este link é inválido ou o orçamento foi removido.</p>
        </div>
      </div>
    )
  }

  return <AprovarOrcamento orc={orc} token={token} />
}
