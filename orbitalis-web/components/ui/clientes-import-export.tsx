'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, Download, X, CheckCircle2, XCircle, FileDown, Loader2 } from 'lucide-react'
import {
  exportarClientesData,
  importarClientes,
  type ImportRow,
  type ImportResult,
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

const CSV_TEMPLATE =
  '﻿' +
  'razao_social;nome_fantasia;documento;endereco;telefone\r\n' +
  'Empresa Exemplo Ltda;Exemplo;12345678000195;Rua das Flores, 100, Centro, São Paulo/SP;(11) 9 9999-9999\r\n'

function parseCsv(text: string): ImportRow[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]
    .replace(/^﻿/, '')
    .split(';')
    .map((h) => h.toLowerCase().replace(/[^a-z_]/g, '').trim())

  function col(row: string[], name: string): string {
    const aliases: Record<string, string[]> = {
      razao_social:  ['razao_social', 'razaosocial', 'nome', 'name'],
      nome_fantasia: ['nome_fantasia', 'nomefantasia', 'fantasia'],
      documento:     ['documento', 'cnpj', 'cpf', 'cpfcnpj'],
      endereco:      ['endereco', 'address', 'logradouro'],
      telefone:      ['telefone', 'fone', 'phone', 'tel'],
    }
    const targets = aliases[name] ?? [name]
    for (const t of targets) {
      const idx = headers.indexOf(t)
      if (idx !== -1) return (row[idx] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()
    }
    return ''
  }

  return lines.slice(1).flatMap((line) => {
    const row = line.split(';')
    const razaoSocial = col(row, 'razao_social')
    const documento   = col(row, 'documento')
    const endereco    = col(row, 'endereco')
    if (!razaoSocial || !documento || !endereco) return []
    return [{
      razaoSocial,
      nomeFantasia: col(row, 'nome_fantasia') || undefined,
      documento,
      endereco,
      telefone: col(row, 'telefone') || undefined,
    }]
  })
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

// ─── Import modal ──────────────────────────────────────────────────────────────

type Step = 'idle' | 'preview' | 'importing' | 'done'

export function ImportarClientesButton() {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState<Step>('idle')
  const [rows, setRows]       = useState<ImportRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [error, setError]     = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('idle'); setRows([]); setResults([]); setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() { setOpen(false); reset() }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsv(text)
      if (parsed.length === 0) {
        setError('Nenhuma linha válida encontrada. Verifique o formato do CSV.')
        return
      }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleImport() {
    setStep('importing')
    startTransition(async () => {
      const res = await importarClientes(rows)
      setResults(res)
      setStep('done')
    })
  }

  function handleDownloadResults() {
    const header = 'razao_social;documento;status;email;senha_temporaria;mensagem'
    const lines = results.map((r) =>
      [r.razaoSocial, r.documento, r.status, r.email ?? '', r.senhaTemporaria ?? '', r.mensagem ?? '']
        .map(escapeCsvField)
        .join(';'),
    )
    downloadBlob('﻿' + [header, ...lines].join('\r\n'), 'resultado_importacao.csv')
  }

  const okCount  = results.filter((r) => r.status === 'ok').length
  const errCount = results.filter((r) => r.status === 'erro').length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-border hover:bg-surface transition-colors"
      >
        <Upload size={14} />
        Importar CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-primary">Importar Clientes via CSV</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Step: idle — upload */}
              {step === 'idle' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Faça upload de um arquivo <strong>.csv</strong> com as colunas:{' '}
                    <code className="bg-surface px-1 rounded text-xs">razao_social; nome_fantasia; documento; endereco; telefone</code>
                  </p>

                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 hover:bg-surface/50 transition-colors">
                    <Upload size={28} className="text-primary/40" />
                    <span className="text-sm text-gray-500">Clique para selecionar o arquivo CSV</span>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                  </label>

                  {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

                  <button
                    type="button"
                    onClick={() => downloadBlob(CSV_TEMPLATE, 'modelo_clientes.csv')}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <FileDown size={13} />
                    Baixar modelo CSV
                  </button>
                </div>
              )}

              {/* Step: preview */}
              {step === 'preview' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    <strong>{rows.length}</strong> cliente(s) encontrado(s). Confira o preview antes de importar:
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-surface">
                        <tr>
                          {['Razão Social', 'Documento', 'Endereço', 'Telefone'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-surface/60">
                            <td className="px-3 py-2 font-medium text-gray-900">{r.razaoSocial}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{r.documento}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-[180px] truncate">{r.endereco}</td>
                            <td className="px-3 py-2 text-gray-500">{r.telefone ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 10 && (
                    <p className="text-xs text-gray-400">… e mais {rows.length - 10} linha(s) não exibidas.</p>
                  )}
                </div>
              )}

              {/* Step: importing */}
              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm text-gray-600">Importando {rows.length} cliente(s)…</p>
                  <p className="text-xs text-gray-400">Isso pode levar alguns segundos.</p>
                </div>
              )}

              {/* Step: done */}
              {step === 'done' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {okCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                        <CheckCircle2 size={16} /> {okCount} importado(s) com sucesso
                      </div>
                    )}
                    {errCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                        <XCircle size={16} /> {errCount} com erro
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-surface">
                        <tr>
                          {['Razão Social', 'Documento', 'Status', 'E-mail / Erro'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.map((r, i) => (
                          <tr key={i} className={r.status === 'erro' ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.razaoSocial}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{r.documento}</td>
                            <td className="px-3 py-2">
                              {r.status === 'ok'
                                ? <span className="text-green-700 font-semibold">OK</span>
                                : <span className="text-destructive font-semibold">Erro</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">
                              {r.status === 'ok' ? r.email : r.mensagem}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {okCount > 0 && (
                    <p className="text-xs text-gray-500">
                      As senhas temporárias dos clientes importados estão no arquivo de resultado abaixo.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
              {step === 'done' ? (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadResults}
                    className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                  >
                    <FileDown size={14} />
                    Baixar resultado com senhas
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
                  >
                    Concluir
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={step === 'preview' ? reset : handleClose}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface transition-colors"
                  >
                    {step === 'preview' ? 'Escolher outro arquivo' : 'Cancelar'}
                  </button>
                  {step === 'preview' && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={pending}
                      className="px-5 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 disabled:opacity-60 transition-colors"
                    >
                      Importar {rows.length} cliente(s)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
