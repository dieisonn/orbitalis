import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { dataHora, qtd, type InventarioDetalhe } from '@/lib/suprimentos'
import { BotaoImprimir } from './botao-imprimir'

type Config = { nomeEmpresa: string; nomeFantasia: string | null }

export default async function FolhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [inv, config] = await Promise.all([
    api.get<InventarioDetalhe>(`/inventarios/${id}`).catch(() => null),
    api.get<Config>('/configuracao').catch(() => null),
  ])
  if (!inv) notFound()
  const cega = inv.contagemCega
  return (
    <div className="bg-white text-black p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4 print:mb-2">
        <div>
          <p className="text-sm text-gray-600">{config?.nomeFantasia || config?.nomeEmpresa}</p>
          <h1 className="text-xl font-bold">Folha de contagem — #{inv.numero} · {inv.titulo}</h1>
          <p className="text-xs text-gray-600">Aberto em {dataHora(inv.criadoEm)}{cega ? ' · contagem cega (sem saldo do sistema)' : ''} · {inv.itens.length} itens</p>
          <p className="text-xs text-gray-600 mt-1">Contado por: ______________________ &nbsp; Data: ____/____/______</p>
        </div>
        <BotaoImprimir />
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left text-xs uppercase">
            <th className="border border-gray-400 px-2 py-1.5">Local</th>
            <th className="border border-gray-400 px-2 py-1.5">Código</th>
            <th className="border border-gray-400 px-2 py-1.5">Produto</th>
            <th className="border border-gray-400 px-2 py-1.5">Un.</th>
            {!cega && <th className="border border-gray-400 px-2 py-1.5 text-right">Sistema</th>}
            <th className="border border-gray-400 px-2 py-1.5 w-28">Contado</th>
            <th className="border border-gray-400 px-2 py-1.5 w-40">Observação</th>
          </tr>
        </thead>
        <tbody>
          {inv.itens.map((i) => (
            <tr key={i.id} className="break-inside-avoid">
              <td className="border border-gray-400 px-2 py-2">{i.produto.localizacao ?? ''}</td>
              <td className="border border-gray-400 px-2 py-2">{i.produto.codigoInterno ?? `#${i.produto.numero}`}</td>
              <td className="border border-gray-400 px-2 py-2">{i.produto.nome}{i.produto.marca ? <span className="text-gray-500"> · {i.produto.marca}</span> : null}</td>
              <td className="border border-gray-400 px-2 py-2">{i.produto.unidade}</td>
              {!cega && <td className="border border-gray-400 px-2 py-2 text-right">{qtd(i.saldoSistema)}</td>}
              <td className="border border-gray-400 px-2 py-2" />
              <td className="border border-gray-400 px-2 py-2" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
