import { NovoClienteForm } from './form'

export default function NovoClientePage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <a href="/clientes" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Clientes
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Novo Cliente</h1>
      </div>
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-border p-6">
          <NovoClienteForm />
        </div>
      </div>
    </div>
  )
}
