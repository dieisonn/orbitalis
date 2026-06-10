'use client'
import { useTransition, useState } from 'react'
import { salvarConfiguracao } from './actions'

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
}

export function ConfiguracaoForm({ config }: { config: Config }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState(config.logoUrl ?? '')
  const [cor, setCor] = useState(config.corPrimaria ?? '#0505ad')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null); setSuccess(false)
    startTransition(async () => {
      const result = await salvarConfiguracao(
        fd.get('nomeEmpresa') as string,
        fd.get('nomeFantasia') as string,
        fd.get('logoUrl') as string,
        fd.get('corPrimaria') as string,
        fd.get('cnpj') as string,
        fd.get('telefone') as string,
        fd.get('endereco') as string,
      )
      if (!result.ok) { setError(result.error ?? 'Erro ao salvar'); return }
      setSuccess(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div className="flex items-center gap-4 p-5" style={{ backgroundColor: cor }}>
          {logoPreview ? (
            <div className="bg-white rounded-2xl p-2 shrink-0">
              <img src={logoPreview} alt="Logo" className="h-12 w-auto object-contain"
                onError={() => setLogoPreview('')} />
            </div>
          ) : (
            <div className="bg-white/20 rounded-2xl px-4 py-2">
              <span className="text-white font-black text-lg">LOGO</span>
            </div>
          )}
          <div className="text-white min-w-0">
            <p className="font-bold text-lg leading-tight">Preview do sidebar</p>
            <p className="text-white/60 text-xs">Assim aparecerá para os usuários</p>
          </div>
        </div>
      </div>

      {/* Identidade */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Identidade da Empresa</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razão Social <span className="text-destructive">*</span>
            </label>
            <input name="nomeEmpresa" required defaultValue={config.nomeEmpresa}
              placeholder="Ex: Frio Tech Ltda"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia / Marca</label>
            <input name="nomeFantasia" defaultValue={config.nomeFantasia ?? ''}
              placeholder="Ex: FrioTech"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input name="cnpj" defaultValue={config.cnpj ?? ''}
              placeholder="00.000.000/0000-00"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
            <input name="telefone" defaultValue={config.telefone ?? ''}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input name="endereco" defaultValue={config.endereco ?? ''}
              placeholder="Rua Exemplo, 123 — São Paulo, SP"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
      </div>

      {/* Visual */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visual</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Logo</label>
            <input name="logoUrl" type="url" defaultValue={config.logoUrl ?? ''}
              placeholder="https://suaempresa.com/logo.png"
              onChange={(e) => setLogoPreview(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <p className="text-xs text-gray-400 mt-1">PNG ou SVG com fundo transparente. Deixe em branco para usar o logo padrão.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
            <div className="flex items-center gap-3">
              <input name="corPrimaria" type="color" defaultValue={config.corPrimaria ?? '#0505ad'}
                onChange={(e) => setCor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border p-1" />
              <span className="text-xs text-gray-400">Cor do sidebar, botões, cabeçalho da O.S.</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Configurações salvas com sucesso!</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors">
          {isPending ? 'Salvando…' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  )
}
