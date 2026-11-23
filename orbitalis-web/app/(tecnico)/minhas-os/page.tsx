import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OsList, type OrdemServicoLista } from './os-list'
import { ResumoTecnicoCard, type ResumoTecnico } from './resumo-tecnico'

export default async function MinhasOsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  let ordens: OrdemServicoLista[] = []
  try {
    ordens = await api.get<OrdemServicoLista[]>(`/ordens-servico/tecnico/${userId}`)
  } catch {
    // API indisponível
  }

  let resumo: ResumoTecnico | null = null
  try {
    resumo = await api.get<ResumoTecnico>('/ordens-servico/meu-resumo')
  } catch {
    // painel é complemento: a lista funciona sem ele
  }

  return <OsList ordens={ordens} resumo={resumo ? <ResumoTecnicoCard r={resumo} /> : null} />
}
