'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, Download, X, CheckCircle2, XCircle, FileDown, Loader2 } from 'lucide-react'
import {
  exportarEquipamentosData,
  importarEquipamentos,
  type EquipamentoImportRow,
  type EquipamentoImportResult,
  type EquipamentoExportRow,
} from '@/app/(admin)/equipamentos/actions'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCsvField(v: string | number | null | undefined): string {
  const s = v != null ? String(v) : ''
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
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

const EXPORT_HEADERS =
  'ambiente_id;nome;tipo;potencia;marca;modelo;numero_serie;ambiente_nome;cliente_nome;data_instalacao;condicao;valor_aquisicao;diagnostico_inicial'

function buildCsv(rows: EquipamentoExportRow[]): string {
  const lines = rows.map((r) =>
    [
      r.ambienteId,
      r.nome,
      r.tipoEquipamento,
      r.potencia,
      r.marca,
      r.modelo,
      r.numeroSerie,
      r.ambienteNome,
      r.clienteNome,
      r.dataInstalacao,
      r.condicao,
      r.valorAquisicao,
      r.diagnosticoInicial,
    ]
      .map(escapeCsvField)
      .join(';'),
  )
  return '﻿' + [EXPORT_HEADERS, ...lines].join('\r\n')
}

const CSV_TEMPLATE =
  '﻿' +
  EXPORT_HEADERS +
  '\r\n' +
  ';Split Hi-Wall;9000 BTU/h;Daikin;FTXV09AXVJU;ABC123;Recepção;Nome Fantasia do Cliente;2024-01-15;novo;2500;Equipamento em boas condições\r\n'

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): EquipamentoImportRow[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]
    .replace(/^﻿/, '')
    .split(';')
    .map((h) => h.toLowerCase().replace(/[^a-z_]/g, '').trim())

  function col(row: string[], name: string): string {
    const aliases: Record<string, string[]> = {
      nome:              ['nome', 'name', 'equipamento'],
      tipoEquipamento:   ['tipo', 'tipo_equipamento', 'tipoequipamento', 'type'],
      potencia:          ['potencia', 'potência', 'capacidade', 'capacity'],
      marca:             ['marca', 'brand', 'fabricante'],
      modelo:            ['modelo', 'model'],
      numeroSerie:       ['numero_serie', 'numeroserie', 'serie', 'ns', 'serial'],
      ambienteId:        ['ambiente_id', 'ambienteid'],
      ambienteNome:      ['ambiente_nome', 'ambientenome', 'ambiente'],
      clienteNome:       ['cliente_nome', 'clientenome', 'cliente'],
      dataInstalacao:    ['data_instalacao', 'datainstalacao', 'data'],
      condicao:          ['condicao', 'condição', 'condition'],
      valorAquisicao:    ['valor_aquisicao', 'valoraquisicao', 'valor', 'preco'],
      diagnosticoInicial:['diagnostico_inicial', 'diagnosticoinicial', 'diagnostico'],
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
    const nome = col(row, 'nome')
    const tipoEquipamento = col(row, 'tipoEquipamento')
    const marca = col(row, 'marca')
    if (!nome || !tipoEquipamento || !marca) return []

    const valorRaw = col(row, 'valorAquisicao').replace(',', '.')
    const valorAquisicao = valorRaw ? parseFloat(valorRaw) : undefined

    return [
      {
        nome,
        tipoEquipamento,
        potencia:           col(row, 'potencia') || '',
        marca,
        modelo:             col(row, 'modelo')            || undefined,
        numeroSerie:        col(row, 'numeroSerie')        || undefined,
        ambienteId:         col(row, 'ambienteId')         || undefined,
        ambienteNome:       col(row, 'ambienteNome')       || undefined,
        clienteNome:        col(row, 'clienteNome')        || undefined,
        dataInstalacao:     col(row, 'dataInstalacao')     || undefined,
        condicao:           col(row, 'condicao')           || undefined,
        valorAquisicao:     isNaN(valorAquisicao!) ? undefined : valorAquisicao,
        diagnosticoInicial: col(row, 'diagnosticoInicial') || undefined,
      } satisfies EquipamentoImportRow,
    ]
  })
}

// ─── Export button ─────────────────────────────────────────────────────────────

export function ExportarEquipamentosButton() {
  const [pending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const data = await exportarEquipamentosData()
      downloadBlob(buildCsv(data), 'equipamentos.csv')
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

export function ImportarEquipamentosButton() {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState<Step>('idle')
  const [rows, setRows]       = useState<EquipamentoImportRow[]>([])
  const [results, setResults] = useState<EquipamentoImportResult[]>([])
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
        setError('Nenhuma linha válida encontrada. Verifique se o arquivo possui as colunas obrigatórias: nome, tipo, marca.')
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
      const res = await importarEquipamentos(rows)
      setResults(res)
      setStep('done')
    })
  }

  function handleDownloadResults() {
    const header = 'nome;marca;status;mensagem'
    const lines = results.map((r) =>
      [r.nome, r.marca, r.status, r.mensagem ?? ''].map(escapeCsvField).join(';'),
    )
    downloadBlob('﻿' + [header, ...lines].join('\r\n'), 'resultado_importacao_equipamentos.csv')
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-primary">Importar Equipamentos via CSV</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {step === 'idle' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      Faça upload de um arquivo <strong>.csv</strong> com separador{' '}
                      <code className="bg-surface px-1 rounded text-xs">;</code> (ponto e vírgula).
                    </p>
                    <p>
                      <strong>Colunas obrigatórias:</strong>{' '}
                      <code className="bg-surface px-1 rounded text-xs">nome · tipo · marca · (ambiente_id ou ambiente_nome)</code>
                    </p>
                    <p>
                      <strong>Colunas opcionais:</strong>{' '}
                      <code className="bg-surface px-1 rounded text-xs">potencia · modelo · numero_serie · cliente_nome · data_instalacao · condicao · valor_aquisicao · diagnostico_inicial</code>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use <strong>ambiente_id</strong> (mais preciso) ou <strong>ambiente_nome</strong> + <strong>cliente_nome</strong> para identificar o ambiente. Exporte a lista atual para ver os IDs.
                    </p>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 hover:bg-surface/50 transition-colors">
                    <Upload size={28} className="text-primary/40" />
                    <span className="text-sm text-gray-500">Clique para selecionar o arquivo CSV</span>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                  </label>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => downloadBlob(CSV_TEMPLATE, 'modelo_equipamentos.csv')}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <FileDown size={13} />
                    Baixar modelo CSV
                  </button>
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    <strong>{rows.length}</strong> equipamento(s) encontrado(s). Confira antes de importar:
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-surface">
                        <tr>
                          {['Nome', 'Tipo', 'Potência', 'Marca', 'Ambiente / ID'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.slice(0, 12).map((r, i) => (
                          <tr key={i} className="hover:bg-surface/60">
                            <td className="px-3 py-2 font-medium text-gray-900">{r.nome}</td>
                            <td className="px-3 py-2 text-gray-600">{r.tipoEquipamento}</td>
                            <td className="px-3 py-2 text-gray-500">{r.potencia || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.marca}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate font-mono text-[10px]">
                              {r.ambienteId
                                ? r.ambienteId
                                : r.ambienteNome
                                  ? `${r.ambienteNome}${r.clienteNome ? ` · ${r.clienteNome}` : ''}`
                                  : <span className="text-destructive font-sans">não informado</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 12 && (
                    <p className="text-xs text-gray-400">… e mais {rows.length - 12} linha(s) não exibidas.</p>
                  )}
                </div>
              )}

              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm text-gray-600">Importando {rows.length} equipamento(s)…</p>
                  <p className="text-xs text-gray-400">Isso pode levar alguns segundos.</p>
                </div>
              )}

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
                          {['Nome', 'Marca', 'Status', 'Mensagem'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.map((r, i) => (
                          <tr key={i} className={r.status === 'erro' ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.nome}</td>
                            <td className="px-3 py-2 text-gray-600">{r.marca}</td>
                            <td className="px-3 py-2">
                              {r.status === 'ok'
                                ? <span className="text-green-700 font-semibold">OK</span>
                                : <span className="text-destructive font-semibold">Erro</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-500 max-w-[220px] truncate">{r.mensagem ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
              {step === 'done' ? (
                <>
                  {errCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadResults}
                      className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                    >
                      <FileDown size={14} />
                      Baixar resultado
                    </button>
                  )}
                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
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
                      Importar {rows.length} equipamento(s)
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
