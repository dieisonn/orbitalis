'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
type Tecnico = { id: string; nome: string | null; email: string }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'aberta', label: 'Aberta' },
  { value: 'agendada', label: 'Agendada' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

const TIPO_OPTS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
]

export function ExportOsBtn({ tecnicos, clientes }: { tecnicos: Tecnico[]; clientes: Cliente[] }) {
  const hoje = new Date().toISOString().split('T')[0]
  const [de, setDe]             = useState('')
  const [ate, setAte]           = useState(hoje)
  const [status, setStatus]     = useState('')
  const [tipo, setTipo]         = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (de) params.set('de', de)
      if (ate) params.set('ate', ate)
      if (status) params.set('status', status)
      if (tipo) params.set('tipo', tipo)
      if (tecnicoId) params.set('tecnicoId', tecnicoId)
      if (clienteId) params.set('clienteId', clienteId)

      const res = await fetch(`/api/relatorios/os-export?${params}`)
      if (!res.ok) throw new Error('Erro ao exportar')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ordens-servico-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data final</label>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            {TIPO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Técnico</label>
          <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            <option value="">Todos os técnicos</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nomeFantasia ?? c.razaoSocial}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleExport} disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {loading ? 'Gerando planilha…' : 'Exportar Excel (.xlsx)'}
      </button>
    </div>
  )
}
