import { api } from '@/lib/api'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { Building2, Cpu, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'

type OsResumo = {
  id: string
  numero: number | null
  status: 'aberta' | 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  dataAgendamento: string
  ambiente: { nome: string }
  tecnico: { email: string; nome: string | null } | null
}

type Perfil = {
  razaoSocial: string
  nomeFantasia: string | null
  ambientes: { id: string; equipamentos: { id: string }[] }[]
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default async function MeuPainelPage() {
  const [perfil, ordens] = await Promise.all([
    api.get<Perfil>('/clientes/meu-perfil').catch(() => null),
    api.get<OsResumo[]>('/ordens-servico/meus').catch(() => [] as OsResumo[]),
  ])

  const totalEquip = perfil?.ambientes.reduce((acc, a) => acc + a.equipamentos.length, 0) ?? 0
  const ativas = ordens.filter((o) => ['aberta', 'agendada', 'em_andamento'].includes(o.status))
  const concluidas = ordens.filter((o) => o.status === 'concluida')
  const recentes = ordens.slice(0, 6)

  return (
    <div className="max-w-3xl space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {perfil ? (perfil.nomeFantasia ?? perfil.razaoSocial) : 'Painel do Cliente'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumo de manutenções e serviços</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-xl p-4">
          <Building2 size={18} className="text-primary mb-2" />
          <p className="text-2xl font-bold text-gray-900">{perfil?.ambientes.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Ambientes</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <Cpu size={18} className="text-primary mb-2" />
          <p className="text-2xl font-bold text-gray-900">{totalEquip}</p>
          <p className="text-xs text-gray-400 mt-0.5">Equipamentos</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <ClipboardList size={18} className="text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{ativas.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Em andamento</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <CheckCircle2 size={18} className="text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{concluidas.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Concluídas</p>
        </div>
      </div>

      {/* OS recentes */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-700">Ordens de Serviço recentes</h2>
          <Link
            href="/historico"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>

        {recentes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            Nenhuma ordem de serviço registrada ainda.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentes.map((os) => (
              <Link
                key={os.id}
                href={`/historico/${os.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary transition-colors">
                    {os.ambiente?.nome ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtData(os.dataAgendamento)}
                    {os.tecnico
                      ? ` · ${os.tecnico.nome ?? os.tecnico.email}`
                      : ' · Aguardando técnico'}
                  </p>
                </div>
                <StatusBadge status={os.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
