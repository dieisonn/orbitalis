import { api } from '@/lib/api'
import { PrintOS } from './print-os'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function OsPdfPage({ params }: Props) {
  const { id } = await params
  try {
    const os = await api.get<any>(`/ordens-servico/${id}`)
    return <PrintOS os={os} />
  } catch {
    notFound()
  }
}
