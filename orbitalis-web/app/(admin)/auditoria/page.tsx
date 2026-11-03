import { api } from '@/lib/api'
import { ListPagination } from '@/components/ui/list-pagination'
import { CampoData } from '@/components/ui/campo-data'
import { History } from 'lucide-react'

type Log = {
  id: string
  usuarioId: string | null
  usuarioNome: string | null
  usuarioEmail: string | null
  usuarioTipo: string | null
  acao: string
  metodo: string | null
  rota: string | null
  entidade: string | null
  entidadeId: string | null
  descricao: string
  detalhes: Record<string, unknown> | null
  status: number | null
  criadoEm: string
}
type Resposta = { data: Log[]; total: number; page: number; perPage: number }
type Membro = { id: string; nome: string | null; email: string }

type SP = { usuarioId?: string; entidade?: string; acao?: string; de?: string; ate?: string; q?: string; page?: string }

const RECURSOS: Record<string, string> = {
  'ordens-servico': 'O.S.', clientes: 'Clientes', ambientes: 'Ambientes', equipamentos: 'Equipamentos',
  contratos: 'Contratos', 'planos-manutencao': 'Planos preventivos', orcamentos: 'Orçamentos', agenda: 'Agenda',
  usuarios: 'Técnicos', equipe: 'Equipe', convites: 'Convites', configuracao: 'Configurações',
  'modelos-checklist': 'Checklists', 'tipos-servico': 'Tipos de serviço', feriados: 'Feriados', auth: 'Acessos',
}
const ACOES: Record<string, { label: string; cor: string }> = {
  criar:       { label: 'Criou',        cor: 'bg-emerald-100 text-emerald-700' },
  editar:      { label: 'Alterou',      cor: 'bg-sky-100 text-sky-700' },
  excluir:     { label: 'Excluiu',      cor: 'bg-red-100 text-red-700' },
  login:       { label: 'Entrou',       cor: 'bg-gray-100 text-gray-600' },
  login_falha: { label: 'Login falhou', cor: 'bg-amber-100 text-amber-800' },
  falha:       { label: 'Negado/erro',  cor: 'bg-amber-100 text-amber-800' },
}
const LINK: Record<string, string> = {
  'ordens-servico': '/ordens-servico', clientes: '/clientes', contratos: '/contratos', 'planos-manutencao': '/planos-manutencao',
}

const dh = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const k of ['usuarioId', 'entidade', 'acao', 'de', 'ate', 'q', 'page'] as const) if (sp[k]) qs.set(k, sp[k]!)
  qs.set('perPage', '50')

  const [res, equipe] = await Promise.all([
    api.get<Resposta>(`/auditoria?${qs}`).catch(() => null),
    api.get<{ membros: Membro[] }>('/equipe').catch(() => ({ membros: [] as Membro[] })),
  ])

  if (!res) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Registro de atividades</h1>
        <p className="text-sm text-gray-500">Disponível apenas para administradores com acesso total.</p>
      </div>
    )
  }

  const filtrado = !!(sp.usuarioId || sp.entidade || sp.acao || sp.de || sp.ate || sp.q)
  const selecao = 'px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Registro de atividades</h1>
        <p className="text-gray-500 text-sm mt-1">
          Quem fez o quê e quando. {res.total} registro(s){filtrado ? ' com os filtros aplicados' : ''}.
        </p>
      </div>

      <form method="get" className="bg-white rounded-xl border border-border p-4 mb-5 flex flex-wrap items-start gap-3">
        <select name="usuarioId" defaultValue={sp.usuarioId ?? ''} aria-label="Usuário" className={selecao}>
          <option value="">Todos os usuários</option>
          {equipe.membros.filter((m) => m.id).map((m) => <option key={m.id} value={m.id}>{m.nome ?? m.email}</option>)}
        </select>
        <select name="entidade" defaultValue={sp.entidade ?? ''} aria-label="Onde" className={selecao}>
          <option value="">Todas as áreas</option>
          {Object.entries(RECURSOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="acao" defaultValue={sp.acao ?? ''} aria-label="Ação" className={selecao}>
          <option value="">Todas as ações</option>
          {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="w-40 [&_p]:hidden"><CampoData name="de" ariaLabel="De" defaultValue={sp.de ?? ''} /></div>
        <span className="text-xs text-gray-400 pt-3">até</span>
        <div className="w-40 [&_p]:hidden"><CampoData name="ate" ariaLabel="Até" defaultValue={sp.ate ?? ''} /></div>
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar no texto…" aria-label="Buscar" className={`${selecao} min-w-48`} />
        <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90">Filtrar</button>
        {filtrado && <a href="/auditoria" className="px-3 py-1.5 text-sm text-gray-600 hover:text-primary pt-2">Limpar</a>}
      </form>

      {res.data.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <History size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <ul className="divide-y divide-border/60">
            {res.data.map((l) => {
              const a = ACOES[l.acao] ?? { label: l.acao, cor: 'bg-gray-100 text-gray-600' }
              const link = l.entidade && l.entidadeId && LINK[l.entidade] ? `${LINK[l.entidade]}/${l.entidadeId}` : null
              return (
                <li key={l.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.cor}`}>{a.label}</span>
                    <span className="text-sm font-medium text-gray-900">{l.descricao}</span>
                    {link && <a href={link} className="text-xs font-semibold text-primary hover:underline">abrir</a>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {dh(l.criadoEm)} · {l.usuarioNome ?? l.usuarioEmail ?? 'Sistema'}
                    {l.usuarioNome && l.usuarioEmail ? ` (${l.usuarioEmail})` : ''}
                    {l.usuarioTipo ? ` · ${l.usuarioTipo}` : ''}
                    {l.status && l.status >= 400 ? ` · HTTP ${l.status}` : ''}
                  </p>
                  {l.detalhes && Object.keys(l.detalhes).length > 0 && (
                    <details className="mt-1.5">
                      <summary className="text-xs text-primary cursor-pointer select-none">Ver dados enviados</summary>
                      <pre className="mt-1.5 text-[11px] leading-snug bg-surface rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(l.detalhes, null, 2)}</pre>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <ListPagination page={res.page} total={res.total} perPage={res.perPage} basePath="/auditoria" />
      </div>
    </div>
  )
}
