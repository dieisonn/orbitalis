import { api } from '@/lib/api'
import { ExportOsBtn } from './export-os-btn'
import { BarChart3, FileSpreadsheet, FileCheck2, Users, Wrench, Wallet } from 'lucide-react'

type Tecnico = { id: string; nome: string | null; email: string }
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null }

export default async function RelatoriosPage() {
  const [tecnicosRes, clientesRes] = await Promise.all([
    api.get<{ data: Tecnico[] }>('/usuarios/tecnicos?perPage=200').catch(() => ({ data: [] as Tecnico[] })),
    api.get<{ data: Cliente[] }>('/clientes?perPage=200').catch(() => ({ data: [] as Cliente[] })),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe a operação, veja o que precisa de atenção e exporte para planilha ou PDF</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {[
          { href: '/relatorios/contratos', icon: FileCheck2, t: 'Contratos e planos PMOC', d: 'Visitas feitas x atrasadas por contrato, vencimentos e cumprimento' },
          { href: '/relatorios/produtividade', icon: Users, t: 'Produtividade por técnico', d: 'O.S. concluídas, atrasos, tempo médio e carga de cada técnico' },
          { href: '/relatorios/equipamentos', icon: Wrench, t: 'Equipamentos e confiabilidade', d: 'Reincidência de corretivas, tempo entre falhas e equipamentos sem manutenção' },
          { href: '/relatorios/financeiro', icon: Wallet, t: 'Financeiro', d: 'Valor das O.S. por mês, cliente e tipo; orçamentos aprovados e contratos' },
        ].map((r) => (
          <a key={r.href} href={r.href} className="flex items-start gap-3 bg-white rounded-lg border border-border p-5 hover:bg-surface transition-colors">
            <div className="w-10 h-10 rounded-md bg-surface flex items-center justify-center shrink-0"><r.icon size={20} className="text-primary" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">{r.t}</h2>
              <p className="text-sm text-gray-500">{r.d}</p>
            </div>
          </a>
        ))}
      </div>

      <a href="/agenda/relatorio" className="flex items-center gap-3 bg-white rounded-lg border border-border p-5 mb-4 hover:bg-surface transition-colors">
        <div className="w-10 h-10 rounded-md bg-surface flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Atendimentos por tipo</h2>
          <p className="text-sm text-gray-500">Quantas visitas, preventivas, PMOC e retrabalhos, por técnico e por mês</p>
        </div>
      </a>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Exportar Ordens de Serviço</h2>
            <p className="text-xs text-gray-400">Gera planilha Excel (.xlsx) com filtros opcionais</p>
          </div>
        </div>

        <ExportOsBtn tecnicos={tecnicosRes.data} clientes={clientesRes.data} />
      </div>
    </div>
  )
}
