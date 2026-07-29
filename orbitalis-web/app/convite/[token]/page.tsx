import { notFound } from 'next/navigation'
import { ConviteForm } from './convite-form'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

type ConviteInfo = {
  tipo: 'tecnico' | 'cliente'
  email: string | null
  nomeEmpresa: string | null
  razaoSocialCliente: string | null
}

async function getConviteInfo(token: string): Promise<ConviteInfo | null> {
  try {
    const res = await fetch(`${BASE}/convites/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const info = await getConviteInfo(token)

  if (!info) notFound()

  return (
    <ConviteForm
      token={token}
      tipo={info.tipo}
      emailPreenchido={info.email}
      nomeEmpresa={info.nomeEmpresa}
      razaoSocialCliente={info.razaoSocialCliente}
    />
  )
}
