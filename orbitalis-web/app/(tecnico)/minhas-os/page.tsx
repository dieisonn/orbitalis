import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OsList, type OrdemServicoLista } from './os-list'

export default async function MinhasOsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  let ordens: OrdemServicoLista[] = []
  try {
    ordens = await api.get<OrdemServicoLista[]>(`/ordens-servico/tecnico/${userId}`)
  } catch {
    // API indisponível
  }

  return <OsList ordens={ordens} />
}
