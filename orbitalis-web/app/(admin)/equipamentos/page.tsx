import { api } from '@/lib/api'
import { DeleteButton } from '@/components/ui/delete-button'
import { QrModal } from '@/components/ui/qr-modal'
import { deletarEquipamento } from './actions'
import { Cpu } from 'lucide-react'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
}

export default async function EquipamentosPage() {
  let equipamentos: Equipamento[] = []
  try {
    equipamentos = await api.get<Equipamento[]>('/equipamentos')
  } catch {
    // API indisponível
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {equipamentos.length} ativo(s) cadastrado(s)
          </p>
        </div>
        <a
          href="/equipamentos/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          + Novo Equipamento
        </a>
      </div>

      {equipamentos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-border">
          <Cpu size={40} className="mx-auto text-primary/20 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum equipamento cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Equipamento', 'Tipo', 'Marca / Modelo', 'Nº Série', 'QR Code', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {equipamentos.map((eq) => (
                <tr key={eq.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{eq.nome}</td>
                  <td className="px-6 py-4 text-gray-500">{eq.tipoEquipamento}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {eq.numeroSerie || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <QrModal
                      equipamentoId={eq.id}
                      codigoQr={eq.codigoQr}
                      nome={eq.nome}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/equipamentos/${eq.id}/editar`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Editar
                      </a>
                      <DeleteButton action={deletarEquipamento.bind(null, eq.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
