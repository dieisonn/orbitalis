import { NovoTecnicoForm } from './form'

export default function NovoTecnicoPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Novo Técnico</h1>
        <p className="text-gray-500 text-sm mt-1">
          Crie um acesso para um técnico de campo usar no app mobile.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-border">
        <NovoTecnicoForm />
      </div>
    </div>
  )
}
