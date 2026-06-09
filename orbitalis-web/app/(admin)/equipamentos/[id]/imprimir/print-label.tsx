'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'

type Equipamento = {
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: { nome: string; localizacaoInterna: string; cliente: { razaoSocial: string; nomeFantasia: string | null } }
}

export function PrintLabel({ equipamento: eq }: { equipamento: Equipamento }) {
  const cliente = eq.ambiente.cliente.nomeFantasia ?? eq.ambiente.cliente.razaoSocial
  const qrValue = `ORB:${eq.codigoQr}`

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-border px-6 py-3 flex items-center justify-between z-10">
        <p className="text-sm font-semibold text-gray-700">Etiqueta — {eq.nome}</p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Printer size={14} />
          Imprimir
        </button>
      </div>

      {/* Label — centered preview; on print fills the page */}
      <div className="print:m-0 min-h-screen bg-gray-100 flex items-center justify-center print:bg-white pt-16 print:pt-0">
        <div
          className="bg-white rounded-2xl print:rounded-none shadow-md print:shadow-none border border-border print:border-0"
          style={{ width: '9cm', padding: '1cm' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Orbitalis</p>
              <p className="text-[9px] text-gray-400">Gestão de Ativos</p>
            </div>
            <p className="font-mono text-xs font-bold text-primary">{eq.codigoQr}</p>
          </div>

          {/* QR + info */}
          <div className="flex gap-4 items-start">
            <div className="shrink-0 border border-gray-200 rounded-lg p-1">
              <QRCodeSVG value={qrValue} size={100} level="M" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="font-bold text-sm text-gray-900 leading-tight">{eq.nome}</p>
              <p className="text-[11px] text-gray-500">{eq.tipoEquipamento}</p>
              {(eq.marca || eq.modelo) && (
                <p className="text-[11px] text-gray-500">
                  {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                </p>
              )}
              {eq.numeroSerie && (
                <p className="text-[10px] font-mono text-gray-400">S/N: {eq.numeroSerie}</p>
              )}
              <div className="pt-1 border-t border-gray-100">
                <p className="text-[10px] text-gray-500 font-medium">{eq.ambiente.nome}</p>
                <p className="text-[9px] text-gray-400">{eq.ambiente.localizacaoInterna}</p>
                <p className="text-[9px] text-gray-400">{cliente}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 9cm 6cm; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </>
  )
}
