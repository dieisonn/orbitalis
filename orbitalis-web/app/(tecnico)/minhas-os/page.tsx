import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OsList } from './os-list'

type OrdemServico = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  ambiente: { nome: string; localizacaoInterna: string }
  itens: { id: string }[]
}

export default async function MinhasOsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  let ordens: OrdemServico[] = []
  try {
    ordens = await api.get<OrdemServico[]>(`/ordens-servico/tecnico/${userId}`)
  } catch {
    // API indisponível
  }

  return <OsList ordens={ordens} />
}
