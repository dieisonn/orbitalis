'use client'

import { Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const APP_URL = 'https://orbitalis-web.vercel.app'

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: { nome: string; localizacaoInterna: string; cliente: { razaoSocial: string; nomeFantasia: string | null } }
}

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null }

type Props = {
  equipamentos: Equipamento[]
  config: Config
  empresaNome: string
}

export function BatchPrintLabels({ equipamentos, config, empresaNome }: Props) {
  return (
    <>
      {/* Toolbar — oculta na impressão */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-border px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">
          {equipamentos.length} etiqueta{equipamentos.length !== 1 ? 's' : ''} selecionada{equipamentos.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          <a href="/equipamentos" className="text-sm text-gray-500 hover:text-primary transition-colors">
            ← Voltar
          </a>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Printer size={14} />
            Imprimir {equipamentos.length} etiqueta{equipamentos.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Grid de etiquetas */}
      <div className="min-h-screen bg-gray-100 print:bg-white pt-16 print:pt-0 p-6 print:p-0">
        <div className="labels-grid">
          {equipamentos.map((eq) => {
            const cliente  = eq.ambiente.cliente.nomeFantasia ?? eq.ambiente.cliente.razaoSocial
            const qrValue  = `${APP_URL}/e/${eq.codigoQr}`
            return (
              <div key={eq.id} className="label-item bg-white rounded-2xl print:rounded-none shadow-md print:shadow-none border border-border print:border-0">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    {config.logoUrl ? (
                      <img
                        src={config.logoUrl}
                        alt={empresaNome}
                        className="h-4 w-auto object-contain max-w-[55px]"
                      />
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                        {empresaNome}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] font-bold text-primary">{eq.codigoQr}</p>
                </div>

                {/* QR + info */}
                <div className="flex gap-2.5 items-start">
                  <div className="shrink-0 border border-gray-200 rounded-md p-0.5">
                    <QRCodeSVG value={qrValue} size={88} level="M" />
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className="font-bold text-[11px] text-gray-900 leading-tight">{eq.nome}</p>
                    <p className="text-[9px] text-gray-500">{eq.tipoEquipamento}</p>
                    {(eq.marca || eq.modelo) && (
                      <p className="text-[9px] text-gray-500">{[eq.marca, eq.modelo].filter(Boolean).join(' ')}</p>
                    )}
                    {eq.numeroSerie && (
                      <p className="text-[9px] font-mono text-gray-400">S/N: {eq.numeroSerie}</p>
                    )}
                    <div className="pt-1 border-t border-gray-100 mt-0.5">
                      <p className="text-[9px] text-gray-600 font-medium truncate">{eq.ambiente.nome}</p>
                      {eq.ambiente.localizacaoInterna && (
                        <p className="text-[8px] text-gray-400 truncate">{eq.ambiente.localizacaoInterna}</p>
                      )}
                      <p className="text-[8px] text-gray-400 truncate">{cliente}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(2, 9cm);
          gap: 0.5cm;
          justify-content: center;
        }
        .label-item {
          width: 9cm;
          padding: 0.6cm;
          box-sizing: border-box;
        }
        @media print {
          @page { size: A4; margin: 1cm; }
          body   { margin: 0; }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.4cm;
          }
          .label-item {
            width: auto;
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}
