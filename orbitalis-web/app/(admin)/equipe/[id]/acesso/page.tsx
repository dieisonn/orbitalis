import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { EditarAcessoForm } from './form'

type Membro = { id: string; email: string; nome: string | null; tipo: string; perfilAcesso: string | null; permissoes: string[] }

export default async function EditarAcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const equipe = await api.get<{ membros: Membro[] }>('/equipe').catch(() => ({ membros: [] as Membro[] }))
  const m = equipe.membros.find((x) => x.id === id && x.tipo === 'admin')
  if (!m) notFound()

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/equipe" className="text-sm text-gray-500 hover:text-primary transition-colors">← Equipe</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Acesso de {m.nome ?? m.email}</h1>
      </div>
      <div className="max-w-2xl bg-white rounded-xl border border-border p-6">
        <EditarAcessoForm userId={m.id} perfil={m.perfilAcesso ?? 'administrador'} modulos={m.permissoes ?? []} />
      </div>
    </div>
  )
}
