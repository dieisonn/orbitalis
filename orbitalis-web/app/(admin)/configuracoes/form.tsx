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
  email?: string | null
  site?: string | null
  instrucoesOs?: string | null
  agrupamentoOsPadrao?: string | null
  cidade?: string | null
  uf?: string | null
  codigoIbge?: string | null
}

export function ConfiguracaoForm({ config }: { config: Config }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState(config.logoUrl ?? '')
  const [cor, setCor] = useState(config.corPrimaria ?? '#0505ad')
  // Localização: base para feriados estaduais/municipais. Pode ser preenchida pelo CEP (ViaCEP).
  const [cidade, setCidade] = useState(config.cidade ?? '')
  const [uf, setUf] = useState(config.uf ?? '')
  const [ibge, setIbge] = useState(config.codigoIbge ?? '')
  const [cep, setCep] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [avisoCep, setAvisoCep] = useState<string | null>(null)

  async function buscarCep() {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) { setAvisoCep('O CEP tem 8 dígitos.'); return }
    setBuscandoCep(true); setAvisoCep(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const d = await res.json()
      if (!res.ok || d?.erro) throw new Error('CEP não encontrado')
      setCidade(d.localidade ?? ''); setUf((d.uf ?? '').toUpperCase()); setIbge(d.ibge ?? '')
      setAvisoCep(`Preenchido: ${d.localidade}/${d.uf}. Confira e salve.`)
    } catch {
      setAvisoCep('Não foi possível consultar o CEP agora. Preencha a cidade e o estado manualmente.')
    } finally { setBuscandoCep(false) }
  }

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
        // só envia a localização se mudou (mantém compatível com a versão anterior do servidor)
        cidade !== (config.cidade ?? '') || uf !== (config.uf ?? '') || ibge !== (config.codigoIbge ?? '')
          ? { cidade, uf, codigoIbge: ibge }
          : undefined,
        { email: fd.get('email') as string, site: fd.get('site') as string, instrucoesOs: fd.get('instrucoesOs') as string, agrupamentoOsPadrao: fd.get('agrupamentoOsPadrao') as string },
      )
      if (!result.ok) { setError(result.error ?? 'Erro ao salvar'); return }
      setSuccess(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prévia do topo do menu */}
      <div className="rounded-lg border border-border bg-[var(--nav-bg)] p-3 max-w-xs">
        <p className="text-xs text-gray-500 mb-2">Assim aparece no topo do menu</p>
        <div className="bg-white rounded-md h-14 px-3 flex items-center justify-center border border-[var(--nav-border)]">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="max-h-10 w-auto max-w-full object-contain"
              onError={() => setLogoPreview('')} />
          ) : (
            <span className="text-gray-400 font-semibold">Sua logo</span>
          )}
        </div>
        <button type="button" tabIndex={-1} className="mt-3 px-3 py-1.5 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: cor }}>
          Botão de exemplo
        </button>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input name="email" type="email" defaultValue={config.email ?? ''}
              placeholder="contato@suaempresa.com.br"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <input name="site" defaultValue={config.site ?? ''}
              placeholder="www.suaempresa.com.br"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Instruções impressas na O.S.</label>
            <textarea name="instrucoesOs" rows={5} defaultValue={config.instrucoesOs ?? ''} maxLength={2000}
              placeholder={'Ex.:\n• Preencha data e hora de chegada.\n• Pagamentos somente pelo setor comercial.'}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y" />
            <p className="text-xs text-gray-500 mt-1">Aparece em todas as ordens de serviço impressas, para o técnico. Deixe em branco para não imprimir.</p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="agrupamentoOsPadrao" className="block text-sm font-medium text-gray-700 mb-1">O.S. geradas pelos planos preventivos</label>
            <select id="agrupamentoOsPadrao" name="agrupamentoOsPadrao" defaultValue={config.agrupamentoOsPadrao ?? 'cliente'}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option value="cliente">Uma O.S. por visita (todos os equipamentos do cliente juntos)</option>
              <option value="ambiente">Uma O.S. por ambiente</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Padrão para todos os planos; cada plano pode escolher outro. Por visita, a agenda recebe um evento só e o técnico preenche um documento só.</p>
          </div>
        </div>
      </div>

      {/* Localização */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Localização</p>
        <p className="text-xs text-gray-500 mb-3">Usada para os feriados do seu município e estado. Informe o CEP para preencher sozinho.</p>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-3">
            <label htmlFor="cep-busca" className="block text-sm font-medium text-gray-700 mb-1">CEP da empresa</label>
            <div className="flex gap-2">
              <input id="cep-busca" value={cep} onChange={(e) => setCep(e.target.value)} inputMode="numeric" placeholder="00000-000"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCep() } }}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <button type="button" onClick={buscarCep} disabled={buscandoCep}
                className="px-4 py-2.5 border border-border rounded-lg text-sm font-semibold text-gray-700 hover:bg-surface disabled:opacity-60 whitespace-nowrap">
                {buscandoCep ? 'Buscando…' : 'Preencher'}
              </button>
            </div>
          </div>
          <div className="md:col-span-3" />
          <div className="md:col-span-3">
            <label htmlFor="cfg-cidade" className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input id="cfg-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={120} placeholder="Ex: Patos de Minas"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="cfg-uf" className="block text-sm font-medium text-gray-700 mb-1">UF</label>
            <input id="cfg-uf" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="MG"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="cfg-ibge" className="block text-sm font-medium text-gray-700 mb-1">Código IBGE</label>
            <input id="cfg-ibge" value={ibge} onChange={(e) => setIbge(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" placeholder="7 dígitos"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        {avisoCep && <p role="status" className="text-xs text-gray-600 mt-2">{avisoCep}</p>}
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
              <span className="text-xs text-gray-400">Usada nos botões principais e no cabeçalho da O.S.</span>
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
