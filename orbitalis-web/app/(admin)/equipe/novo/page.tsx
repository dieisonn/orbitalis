import { NovoUsuarioForm } from './form'

export default function NovoUsuarioPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/equipe" className="text-sm text-gray-500 hover:text-primary transition-colors">← Equipe</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Adicionar usuário</h1>
      </div>
      <div className="max-w-2xl bg-white rounded-xl border border-border p-6">
        <p className="text-sm text-gray-500 mb-5">
          Para usuários do escritório (administrador, financeiro, atendimento…). Técnicos continuam sendo adicionados em <a href="/usuarios" className="text-primary font-semibold hover:underline">Técnicos</a>, com acesso só às suas O.S.
        </p>
        <NovoUsuarioForm />
      </div>
    </div>
  )
}
