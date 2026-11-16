'use client'

import { Download, Printer } from 'lucide-react'

export type Coluna = { k: string; t: string }

// CSV no padrão do Excel em português (separador ";" e acentos corretos)
function baixarCsv(nome: string, colunas: Coluna[], linhas: Record<string, unknown>[]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const corpo = [colunas.map((c) => esc(c.t)).join(';'), ...linhas.map((l) => colunas.map((c) => esc(l[c.k])).join(';'))].join('\r\n')
  const blob = new Blob(['﻿' + corpo], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function AcoesRelatorio({ nome, colunas, linhas }: { nome: string; colunas: Coluna[]; linhas: Record<string, unknown>[] }) {
  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-gray-700 hover:bg-surface'
  return (
    <div className="flex gap-2 print:hidden">
      <button onClick={() => baixarCsv(nome, colunas, linhas)} className={btn}><Download size={14} /> Baixar planilha (CSV)</button>
      <button onClick={() => window.print()} className={btn}><Printer size={14} /> Imprimir / PDF</button>
    </div>
  )
}
