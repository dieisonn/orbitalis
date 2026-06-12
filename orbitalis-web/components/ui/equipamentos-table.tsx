'use client'

import { useState } from 'react'
import { QrModal } from './qr-modal'
import { DeleteButton } from './delete-button'
import { Printer } from 'lucide-react'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  } | null
}

type Props = {
  equipamentos: Equipamento[]
  deletarAction: (id: string) => Promise<void>
}

export function EquipamentosTable({ equipamentos, deletarAction }: Props) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selecionados.size === equipamentos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(equipamentos.map((e) => e.id)))
    }
  }

  function handleImprimirLote() {
    const ids = Array.from(selecionados).join(',')
    window.open(`/equipamentos/imprimir-lote?ids=${ids}`, '_blank')
  }

  const allSelected = selecionados.size === equipamentos.length && equipamentos.length > 0

  return (
    <div className="relative">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-border cursor-pointer accent-primary"
                title="Selecionar todos"
              />
            </th>
            {['Equipamento', 'Cliente / Ambiente', 'Tipo', 'Marca / Modelo', 'Nº Série', 'QR Code', ''].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {equipamentos.map((eq) => {
            const checked = selecionados.has(eq.id)
            return (
              <tr
                key={eq.id}
                className={`hover:bg-surface transition-colors ${checked ? 'bg-primary/5' : ''}`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(eq.id)}
                    className="rounded border-border cursor-pointer accent-primary"
                  />
                </td>
                <td className="px-4 py-4 font-medium text-gray-900">{eq.nome}</td>
                <td className="px-4 py-4">
                  {eq.ambiente ? (
                    <>
                      <p className="text-xs font-medium text-gray-700">
                        {eq.ambiente.cliente?.nomeFantasia ?? eq.ambiente.cliente?.razaoSocial}
                      </p>
                      <p className="text-xs text-gray-400">{eq.ambiente.nome}</p>
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-500">{eq.tipoEquipamento}</td>
                <td className="px-4 py-4 text-gray-600">
                  {[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-gray-500">{eq.numeroSerie || '—'}</td>
                <td className="px-4 py-4">
                  <QrModal equipamentoId={eq.id} codigoQr={eq.codigoQr} nome={eq.nome} />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/equipamentos/${eq.id}/historico`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      title="Histórico de custos"
                    >
                      Histórico
                    </a>
                    <a href={`/equipamentos/${eq.id}/editar`} className="text-xs font-semibold text-primary hover:underline">
                      Editar
                    </a>
                    <DeleteButton action={deletarAction.bind(null, eq.id)} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Barra de impressão em lote */}
      {selecionados.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-primary text-white px-6 py-3 flex items-center justify-between rounded-b-2xl">
          <span className="text-sm font-semibold">
            {selecionados.size} equipamento{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelecionados(new Set())}
              className="text-xs text-white/70 hover:text-white transition-colors"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={handleImprimirLote}
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-primary text-sm font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              <Printer size={14} />
              Imprimir etiquetas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
