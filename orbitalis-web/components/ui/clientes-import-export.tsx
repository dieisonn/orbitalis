'use client'

import { useTransition } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  exportarClientesData,
  type ClienteExportRow,
} from '@/app/(admin)/clientes/actions'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCsvField(v: string | null | undefined): string {
  const s = v ?? ''
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(rows: ClienteExportRow[]): string {
  const header = 'razao_social;nome_fantasia;documento;endereco;telefone'
  const lines = rows.map((r) =>
    [r.razaoSocial, r.nomeFantasia, r.documento, r.endereco, r.telefone]
      .map(escapeCsvField)
      .join(';'),
  )
  return '﻿' + [header, ...lines].join('\r\n')
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export button ─────────────────────────────────────────────────────────────

export function ExportarClientesButton() {
  const [pending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const data = await exportarClientesData()
      downloadBlob(buildCsv(data), 'clientes.csv')
    })
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary text-sm font-semibold rounded-lg border border-primary hover:bg-primary/5 disabled:opacity-60 transition-colors"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {pending ? 'Exportando…' : 'Exportar CSV'}
    </button>
  )
}

