import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { DiaClient, type ResumoOS } from './dia-client'
import type { OS, Config } from '../[id]/pdf/print-os'

type Props = { searchParams: Promise<{ data?: string; tecnicoId?: string; todas?: string }> }
type Tecnico = { id: string; email: string; nome: string | null }
type Linha = { id: string; status: string; dataAgendamento: string }

const DIA_MS = 86_400_000
// O sistema trabalha no horário de Brasília (UTC-3, sem horário de verão)
const diaBR = (d: Date | string) => new Date(new Date(d).getTime() - 3 * 3_600_000).toISOString().slice(0, 10)
const somaDias = (dia: string, n: number) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10)
const dataValida = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime())

const MAX_OS = 100

export default async function OsDoDiaPage({ searchParams }: Props) {
  const sp = await searchParams
  const dia = dataValida(sp.data) ? sp.data! : somaDias(diaBR(new Date()), 1) // padrão: amanhã
  const incluirTodas = sp.todas === '1'

  // Busca com folga de um dia para cada lado e filtra pelo dia de Brasília aqui,
  // porque o filtro de datas da API não considera o fuso.
  const qs = new URLSearchParams({
    dataInicio: `${somaDias(dia, -1)}T00:00:00Z`,
    dataFim: somaDias(dia, 1),
    orderBy: 'data_asc',
    perPage: '200',
  })
  if (sp.tecnicoId) qs.set('tecnicoId', sp.tecnicoId)

  let erro = ''
  const [lista, tecnicosRes, config] = await Promise.all([
    api.get<{ data: Linha[] }>(`/ordens-servico?${qs}`).catch((e: unknown) => { erro = e instanceof Error ? e.message : 'erro'; return null }),
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=1000').catch(() => ({ data: [] as Tecnico[] })),
    api.get<Config>('/configuracao').catch(() => null),
  ])

  const doDia = (lista?.data ?? [])
    .filter((o) => diaBR(o.dataAgendamento) === dia)
    .filter((o) => incluirTodas || (o.status !== 'cancelada' && o.status !== 'concluida'))
  const excedeu = doDia.length > MAX_OS
  const ids = doDia.slice(0, MAX_OS).map((o) => o.id)

  // O.S. completas (equipamentos e checklists) para impressão, em grupos de 10
  const completas: OS[] = []
  for (let i = 0; i < ids.length; i += 10) {
    const grupo = await Promise.all(ids.slice(i, i + 10).map((id) => api.get<OS>(`/ordens-servico/${id}`).catch(() => null)))
    completas.push(...grupo.filter((o): o is OS => o !== null))
  }

  const resumos: ResumoOS[] = completas.map((o) => ({
    id: o.id,
    numero: o.numero,
    status: o.status,
    hora: new Date(o.dataAgendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    cliente: o.ambiente.cliente.nomeFantasia || o.ambiente.cliente.razaoSocial,
    ambiente: o.ambiente.nome,
    tecnico: o.tecnico ? (o.tecnico.nome ?? o.tecnico.email) : null,
    tipo: o.tipoServico?.sigla ?? null,
    equipamentos: o.itens.length,
  }))

  const diaLongo = new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="max-w-5xl">
      <div className="print:hidden">
        <Link href="/ordens-servico" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Ordens de serviço
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Printer size={20} /> O.S. do dia para impressão</h1>
        <p className="text-sm text-gray-500 mt-1">
          Escolha o dia e imprima todas as O.S. de uma vez — uma por página, com espaço para o técnico anotar.
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 bg-white border border-border rounded-xl p-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Dia</span>
            <input type="date" name="data" defaultValue={dia} className="px-3 py-2 border border-border rounded-md text-sm bg-white" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Técnico</span>
            <select name="tecnicoId" defaultValue={sp.tecnicoId ?? ''} className="px-3 py-2 border border-border rounded-md text-sm bg-white min-w-[200px]">
              <option value="">Todos os técnicos</option>
              {tecnicosRes.data.map((t) => <option key={t.id} value={t.id}>{t.nome ?? t.email}</option>)}
            </select>
          </label>
          <label className="text-sm flex items-center gap-2 pb-2.5">
            <input type="checkbox" name="todas" value="1" defaultChecked={incluirTodas} />
            <span className="text-gray-700">Incluir concluídas e canceladas</span>
          </label>
          <button type="submit" className="px-4 py-2 bg-action text-white text-sm font-semibold rounded-md hover:bg-action/90">Buscar</button>
          <div className="flex gap-2 pb-0.5 ml-auto text-sm">
            <Link href={`?data=${somaDias(diaBR(new Date()), 0)}${sp.tecnicoId ? `&tecnicoId=${sp.tecnicoId}` : ''}`} className="text-primary hover:underline">Hoje</Link>
            <Link href={`?data=${somaDias(diaBR(new Date()), 1)}${sp.tecnicoId ? `&tecnicoId=${sp.tecnicoId}` : ''}`} className="text-primary hover:underline">Amanhã</Link>
          </div>
        </form>

        {erro && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">Não foi possível buscar as O.S. ({erro}).</p>}
        {excedeu && <p className="mt-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">Há mais de {MAX_OS} O.S. neste dia; mostrando as primeiras {MAX_OS}. Filtre por técnico para ver o restante.</p>}
      </div>

      <DiaClient resumos={resumos} completas={completas} config={config} diaLongo={diaLongo} />
    </div>
  )
}
