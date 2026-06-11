'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'

const APP_URL = 'https://orbitalis-web.vercel.app'

type Equipamento = {
  nome: string
  marca: string
  modelo: string | null
  codigoQr: string
  tipoEquipamento: string
  numeroSerie: string | null
  ambiente: { nome: string; localizacaoInterna: string; cliente: { razaoSocial: string; nomeFantasia: string | null } }
}

type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null }

export function PrintLabel({ equipamento: eq, config }: { equipamento: Equipamento; config: Config }) {
  const cliente    = eq.ambiente.cliente.nomeFantasia ?? eq.ambiente.cliente.razaoSocial
  const qrValue    = `${APP_URL}/e/${eq.codigoQr}`
  const empresaNome = config.nomeFantasia ?? config.nomeEmpresa

  return (
    <>
      {/* Toolbar — oculta na impressão */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-border px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Etiqueta — {eq.nome}</p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Printer size={14} />
          Imprimir
        </button>
      </div>

      {/* Preview — centralizado na tela; na impressão preenche a folha */}
      <div className="print:m-0 min-h-screen bg-gray-100 flex items-center justify-center print:bg-white pt-16 print:pt-0">
        <LabelCard eq={eq} qrValue={qrValue} cliente={cliente} empresaNome={empresaNome} logoUrl={config.logoUrl} />
      </div>

      <style>{`
        @media print {
          @page { size: 9cm 6cm; margin: 0; }
          body   { margin: 0; }
        }
      `}</style>
    </>
  )
}

export function LabelCard({
  eq,
  qrValue,
  cliente,
  empresaNome,
  logoUrl,
}: {
  eq: Equipamento
  qrValue: string
  cliente: string
  empresaNome: string
  logoUrl: string | null
}) {
  return (
    <div
      className="bg-white rounded-2xl print:rounded-none shadow-md print:shadow-none border border-border print:border-0"
      style={{ width: '9cm', padding: '0.7cm' }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={empresaNome}
              className="h-5 w-auto object-contain max-w-[60px]"
            />
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
              {empresaNome}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] font-bold text-primary">{eq.codigoQr}</p>
      </div>

      {/* QR + informações */}
      <div className="flex gap-3 items-start">
        <div className="shrink-0 border border-gray-200 rounded-lg p-1">
          <QRCodeSVG value={qrValue} size={96} level="M" />
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <p className="font-bold text-[12px] text-gray-900 leading-tight">{eq.nome}</p>
          <p className="text-[10px] text-gray-500">{eq.tipoEquipamento}</p>
          {(eq.marca || eq.modelo) && (
            <p className="text-[10px] text-gray-500">
              {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
            </p>
          )}
          {eq.numeroSerie && (
            <p className="text-[9px] font-mono text-gray-400">S/N: {eq.numeroSerie}</p>
          )}
          <div className="pt-1 border-t border-gray-100 mt-1">
            <p className="text-[10px] text-gray-600 font-medium truncate">{eq.ambiente.nome}</p>
            {eq.ambiente.localizacaoInterna && (
              <p className="text-[9px] text-gray-400 truncate">{eq.ambiente.localizacaoInterna}</p>
            )}
            <p className="text-[9px] text-gray-400 truncate">{cliente}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
