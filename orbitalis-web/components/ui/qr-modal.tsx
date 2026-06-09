'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X, Printer } from 'lucide-react'

const APP_URL = 'https://orbitalis-web.vercel.app'

type Props = {
  equipamentoId: string
  codigoQr: string
  nome: string
}

export function QrModal({ equipamentoId, codigoQr, nome }: Props) {
  const [open, setOpen] = useState(false)

  const qrValue = `${APP_URL}/e/${codigoQr}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs font-mono font-semibold rounded-lg hover:bg-primary/20 transition-colors"
        title="Ver QR Code"
      >
        <QrCode size={11} />
        {codigoQr}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-72 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{nome}</p>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-white border-2 border-border rounded-xl">
              <QRCodeSVG value={qrValue} size={180} level="M" />
            </div>

            <p className="font-mono text-xs text-gray-400 tracking-widest">{codigoQr}</p>

            <a
              href={`/equipamentos/${equipamentoId}/imprimir`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Printer size={14} />
              Imprimir Etiqueta
            </a>
          </div>
        </div>
      )}
    </>
  )
}
