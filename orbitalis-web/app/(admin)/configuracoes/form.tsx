'use client'
import { useTransition, useState } from 'react'
import { salvarConfiguracao } from './actions'

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null }

export function ConfiguracaoForm({ config }: { config: Config }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState(config.logoUrl ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nomeEmpresa   = fd.get('nomeEmpresa') as string
    const nomeFantasia  = fd.get('nomeFantasia') as string
    const logoUrl       = fd.get('logoUrl') as string
    const corPrimaria   = fd.get('corPrimaria') as string

    setError(null); setSuccess(false)
    startTransition(async () => {
      const result = await salvarConfiguracao(nomeEmpresa, nomeFantasia, logoUrl, corPrimaria)
      if (!result.ok) {
        setError(result.error ?? 'Erro ao salvar')
        return
      }
      setSuccess(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preview */}
      {logoPreview && (
        <div className="flex items-center gap-4 p-4 bg-primary rounded-2xl">
          <div className="bg-white rounded-3xl p-3">
            <img src={logoPreview} alt="Preview" className="h-12 w-auto object-contain" onError={() => setLogoPreview('')} />
          </div>
          <div className="text-white">
            <p className="font-bold text-lg">Preview do sidebar</p>
            <p className="text-white/60 text-xs">Assim aparecerá para os usuários</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Razão Social / Nome da Empresa <span className="text-destructive">*</span>
          </label>
          <input
            name="nomeEmpresa"
            required
            defaultValue={config.nomeEmpresa}
            placeholder="Ex: Frio Tech Ltda"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Fantasia / Marca
          </label>
          <input
            name="nomeFantasia"
            defaultValue={config.nomeFantasia ?? ''}
            placeholder="Ex: FrioTech (opcional)"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL da Logo
        </label>
        <input
          name="logoUrl"
          type="url"
          defaultValue={config.logoUrl ?? ''}
          placeholder="https://suaempresa.com/logo.png"
          onChange={(e) => setLogoPreview(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-gray-400 mt-1">
          Cole o link direto para sua logo (PNG ou SVG com fundo transparente recomendado).
          Deixe em branco para usar o logo padrão do Orbitalis.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cor Primária
        </label>
        <div className="flex items-center gap-3">
          <input
            name="corPrimaria"
            type="color"
            defaultValue={config.corPrimaria ?? '#0505ad'}
            className="h-10 w-16 cursor-pointer rounded-lg border border-border p-1"
          />
          <span className="text-xs text-gray-400">Cor do sidebar, botões e destaques</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Configurações salvas com sucesso!</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando…' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  )
}
