'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, FileText, X, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  equipamentoId: string
  equipamentoNome: string
  osId?: string
  onSuccess?: (diagId: string) => void
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsText(file, 'utf-8')
  })
}

export function LgmvUpload({ equipamentoId, equipamentoNome, osId, onSuccess }: Props) {
  const [iduFile, setIduFile] = useState<File | null>(null)
  const [oduFile, setOduFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: true; diagId: string } | { ok: false; error: string } | null>(null)
  const iduRef = useRef<HTMLInputElement>(null)
  const oduRef = useRef<HTMLInputElement>(null)

  function handleFileDrop(type: 'idu' | 'odu', file: File | undefined) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return
    if (type === 'idu') setIduFile(file)
    else setOduFile(file)
    setResult(null)
  }

  async function handleEnviar() {
    if (!iduFile && !oduFile) return
    setResult(null)

    startTransition(async () => {
      try {
        const body: Record<string, string> = { equipamentoId }
        if (osId) body.osId = osId
        if (iduFile) {
          body.iduCsv = await readFileAsText(iduFile)
          body.arquivoIduNome = iduFile.name
        }
        if (oduFile) {
          body.oduCsv = await readFileAsText(oduFile)
          body.arquivoOduNome = oduFile.name
        }

        const token = document.cookie.match(/access_token=([^;]+)/)?.[1]
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/diagnosticos-lgmv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setResult({ ok: false, error: err.message ?? 'Erro ao processar diagnóstico.' })
          return
        }
        const data = await res.json()
        setResult({ ok: true, diagId: data.id })
        onSuccess?.(data.id)
        setIduFile(null)
        setOduFile(null)
      } catch {
        setResult({ ok: false, error: 'Erro de conexão. Tente novamente.' })
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-surface flex items-center gap-3">
        <Activity size={16} className="text-primary" />
        <div>
          <p className="text-sm font-semibold text-gray-800">Diagnóstico LGMV</p>
          <p className="text-xs text-gray-400">{equipamentoNome}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* IDU */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Arquivo IDU</p>
            <div
              onClick={() => iduRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                iduFile ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <input
                ref={iduRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileDrop('idu', e.target.files?.[0])}
              />
              {iduFile ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-primary shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{iduFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIduFile(null) }}
                    className="shrink-0 text-gray-400 hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={18} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Clique ou arraste</span>
                  <span className="text-[10px] text-gray-300">IDU*.csv</span>
                </div>
              )}
            </div>
          </div>

          {/* ODU */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Arquivo ODU</p>
            <div
              onClick={() => oduRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                oduFile ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <input
                ref={oduRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileDrop('odu', e.target.files?.[0])}
              />
              {oduFile ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-primary shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{oduFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOduFile(null) }}
                    className="shrink-0 text-gray-400 hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={18} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Clique ou arraste</span>
                  <span className="text-[10px] text-gray-300">ODU*.csv</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
            result.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.ok
              ? <><CheckCircle size={13} /> Diagnóstico gerado! <a href={`/equipamentos/${equipamentoId}/diagnosticos/${result.diagId}`} className="underline font-semibold">Ver relatório</a></>
              : <><AlertTriangle size={13} /> {result.error}</>
            }
          </div>
        )}

        <button
          type="button"
          onClick={handleEnviar}
          disabled={isPending || (!iduFile && !oduFile)}
          className="w-full py-2 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? 'Processando…' : 'Gerar Diagnóstico'}
        </button>
      </div>
    </div>
  )
}
