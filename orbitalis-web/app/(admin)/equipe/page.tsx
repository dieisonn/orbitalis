import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { DeleteButton } from '@/components/ui/delete-button'
import { ConvidarBtn } from '@/components/ui/convidar-btn'
import { removerMembro, revogarConvite } from './actions'
import {
  Users, UserCog, User, Clock, Link2, ShieldCheck,
} from 'lucide-react'

type Membro = {
  id: string
  email: string
  nome: string | null
  tipo: 'admin' | 'tecnico' | 'cliente'
  telefone: string | null
  especialidade: string | null
  dataCriacao: string
}

type ConvitePendente = {
  id: string
  tipo: 'tecnico' | 'cliente'
  email: string | null
  expiresAt: string
  criadoEm: string
  razaoSocialCliente: string | null
}

type Equipe = {
  membros: Membro[]
  convitesPendentes: ConvitePendente[]
}

const TIPO_CONFIG = {
  admin:   { label: 'Administrador', icon: ShieldCheck, color: 'bg-primary/10 text-primary'         },
  tecnico: { label: 'Técnico',       icon: UserCog,     color: 'bg-emerald-100 text-emerald-700'    },
  cliente: { label: 'Cliente',       icon: User,        color: 'bg-orange-100 text-orange-700'      },
}

function Avatar({ nome, email }: { nome: string | null; email: string }) {
  const initial = (nome ?? email).charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
      {initial}
    </div>
  )
}

function Section({ title, icon: Icon, count, children }: {
  title: string
  icon: React.FC<{ size?: number; className?: string }>
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-surface">
        <Icon size={14} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <span className="ml-auto text-xs font-bold tabular-nums text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  )
}

export default async function EquipePage() {
  const [equipe, meuId] = await Promise.all([
    api.get<Equipe>('/equipe').catch(() => ({ membros: [], convitesPendentes: [] })),
    getUserId(),
  ])

  const admins   = equipe.membros.filter((m) => m.tipo === 'admin')
  const tecnicos = equipe.membros.filter((m) => m.tipo === 'tecnico')
  const clientes = equipe.membros.filter((m) => m.tipo === 'cliente')

  const totalMembros = equipe.membros.length
  const totalPendentes = equipe.convitesPendentes.length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Equipe</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalMembros} membro{totalMembros !== 1 ? 's' : ''} ativo{totalMembros !== 1 ? 's' : ''}
            {totalPendentes > 0 && ` · ${totalPendentes} convite${totalPendentes !== 1 ? 's' : ''} pendente${totalPendentes !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConvidarBtn tipo="tecnico" />
        </div>
      </div>

      {/* Administradores */}
      {admins.length > 0 && (
        <Section title="Administradores" icon={ShieldCheck} count={admins.length}>
          <ul className="divide-y divide-border/60">
            {admins.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar nome={m.nome} email={m.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.nome ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                {m.id === meuId && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                    você
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Técnicos */}
      <Section title="Técnicos" icon={UserCog} count={tecnicos.length}>
        {tecnicos.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <UserCog size={32} className="mx-auto text-primary/15 mb-2" />
            <p className="text-sm text-gray-400">Nenhum técnico com acesso ainda.</p>
            <div className="mt-3 flex justify-center">
              <ConvidarBtn tipo="tecnico" label="Convidar técnico" />
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {tecnicos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar nome={m.nome} email={m.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.nome ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  {m.especialidade && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{m.especialidade}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums hidden sm:block">
                  desde {new Date(m.dataCriacao).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                </span>
                <DeleteButton
                  action={removerMembro.bind(null, m.id)}
                  label="Remover"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Clientes com acesso */}
      <Section title="Clientes com acesso ao portal" icon={Users} count={clientes.length}>
        {clientes.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Users size={32} className="mx-auto text-primary/15 mb-2" />
            <p className="text-sm text-gray-400">
              Nenhum cliente com conta ainda. Use o botão "Convidar" na lista de clientes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {clientes.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar nome={m.nome} email={m.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.nome ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <DeleteButton
                  action={removerMembro.bind(null, m.id)}
                  label="Remover"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Convites pendentes */}
      {totalPendentes > 0 && (
        <Section title="Convites pendentes" icon={Link2} count={totalPendentes}>
          <ul className="divide-y divide-border/60">
            {equipe.convitesPendentes.map((c) => {
              const tipoLabel = c.tipo === 'tecnico' ? 'Técnico' : 'Cliente'
              const destino   = c.razaoSocialCliente ?? c.email ?? '—'
              const expira    = new Date(c.expiresAt)
              const hoje      = new Date()
              const diasRestantes = Math.ceil((expira.getTime() - hoje.getTime()) / 86_400_000)

              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{destino}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        c.tipo === 'tecnico'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>{tipoLabel}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Expira em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <DeleteButton
                    action={revogarConvite.bind(null, c.id)}
                    label="Revogar"
                  />
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
