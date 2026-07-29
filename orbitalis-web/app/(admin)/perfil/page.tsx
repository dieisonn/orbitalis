import { api } from '@/lib/api'
import { PerfilForm } from './perfil-form'
import { SenhaForm } from './senha-form'

type Perfil = {
  id: string
  email: string
  nome: string | null
  telefone: string | null
  especialidade: string | null
  crea: string | null
  tipo: string
  dataCriacao: string
}

const TIPO_LABEL: Record<string, string> = {
  admin:   'Administrador',
  tecnico: 'Técnico',
  cliente: 'Cliente',
}

export default async function PerfilPage() {
  let perfil: Perfil | null = null
  try {
    perfil = await api.get<Perfil>('/perfil')
  } catch { /* mostra estado vazio */ }

  if (!perfil) {
    return (
      <div className="max-w-2xl">
        <p className="text-gray-400 text-sm">Não foi possível carregar o perfil.</p>
      </div>
    )
  }

  const initial = (perfil.nome ?? perfil.email).charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie suas informações e acesso.</p>
      </div>

      {/* Cabeçalho com avatar */}
      <div className="bg-white rounded-xl p-5 border border-border flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-black shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-base">{perfil.nome ?? '—'}</p>
          <p className="text-sm text-gray-500">{perfil.email}</p>
          <span className="inline-block mt-1 text-[11px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
            {TIPO_LABEL[perfil.tipo] ?? perfil.tipo}
          </span>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-gray-400">Membro desde</p>
          <p className="text-sm font-medium text-gray-600">
            {new Date(perfil.dataCriacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Formulário de edição */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Informações Pessoais</h2>
        <PerfilForm perfil={perfil} />
      </div>

      {/* Troca de senha */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Segurança</h2>
        <p className="text-xs text-gray-400 mb-4">A nova senha deve ter no mínimo 6 caracteres.</p>
        <SenhaForm />
      </div>
    </div>
  )
}
