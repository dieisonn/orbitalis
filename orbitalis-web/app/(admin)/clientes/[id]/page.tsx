import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Building2, Cpu, ChevronRight } from 'lucide-react'

type Equipamento = {
  id: string
  nome: string
  tipoEquipamento: string
  marca: string
  modelo: string | null
  numeroSerie: string | null
}

type Ambiente = {
  id: string
  nome: string
  localizacaoInterna: string
  metrosQuadrados: number
  capacidadeTermica: string
  equipamentos: Equipamento[]
}

type Cliente = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  documento: string
  endereco: string
  ambientes: Ambiente[]
}

type Props = { params: Promise<{ id: string }> }

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params

  let cliente: Cliente
  try {
    cliente = await api.get<Cliente>(`/clientes/${id}`)
  } catch {
    notFound()
  }

  const totalEquipamentos = cliente.ambientes.reduce(
    (acc, a) => acc + a.equipamentos.length,
    0,
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <a href="/clientes" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Clientes
        </a>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-sm text-gray-500">{cliente.nomeFantasia ?? cliente.razaoSocial}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{cliente.razaoSocial}</h1>
          {cliente.nomeFantasia && (
            <p className="text-gray-400 text-sm mt-0.5">{cliente.nomeFantasia}</p>
          )}
          <p className="text-gray-500 text-sm mt-1 font-mono">{cliente.documento}</p>
          <p className="text-gray-400 text-xs mt-0.5">{cliente.endereco}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-xl font-bold text-primary">{cliente.ambientes.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ambientes</p>
          </div>
          <div className="text-center px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-xl font-bold text-primary">{totalEquipamentos}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Equipamentos</p>
          </div>
          <a
            href={`/clientes/${id}/editar`}
            className="px-3 py-2 text-xs font-semibold border border-border text-gray-600 rounded-lg hover:bg-surface transition-colors"
          >
            Editar
          </a>
        </div>
      </div>

      {/* Árvore de ambientes */}
      {cliente.ambientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Building2 size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum ambiente vinculado a este cliente.</p>
          <a
            href="/ambientes/novo"
            className="mt-3 inline-block text-sm text-primary font-semibold hover:underline"
          >
            Criar ambiente
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {cliente.ambientes.map((amb) => (
            <div
              key={amb.id}
              className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden"
            >
              {/* Cabeçalho do ambiente */}
              <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-primary" />
                  <span className="font-semibold text-gray-800 text-sm">{amb.nome}</span>
                  <span className="text-xs text-gray-400">· {amb.localizacaoInterna}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{Number(amb.metrosQuadrados).toFixed(0)} m²</span>
                  <span>{amb.capacidadeTermica}</span>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <Cpu size={11} />
                    {amb.equipamentos.length} eq.
                  </span>
                  <a
                    href={`/ambientes/${amb.id}/editar`}
                    className="text-primary font-semibold hover:underline"
                  >
                    Editar
                  </a>
                </div>
              </div>

              {/* Equipamentos */}
              {amb.equipamentos.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-400 italic">
                  Nenhum equipamento neste ambiente.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Marca / Modelo</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nº Série</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {amb.equipamentos.map((eq) => (
                      <tr key={eq.id} className="hover:bg-surface/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{eq.nome}</td>
                        <td className="px-4 py-2.5 text-gray-500">{eq.tipoEquipamento}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {eq.marca}{eq.modelo ? ` ${eq.modelo}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono">{eq.numeroSerie ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <a
                            href={`/equipamentos/${eq.id}/editar`}
                            className="text-primary font-semibold hover:underline"
                          >
                            Editar
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
