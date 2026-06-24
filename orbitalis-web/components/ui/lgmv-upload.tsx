'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, Activity, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
import { criarDiagnosticoLgmv } from '@/app/(admin)/equipamentos/[id]/diagnosticos/actions'

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

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function LgmvUpload({ equipamentoId, equipamentoNome, osId, onSuccess }: Props) {
  const router = useRouter()
  const [iduFile, setIduFile] = useState<File | null>(null)
  const [oduFile, setOduFile] = useState<File | null>(null)
  const [dataInspecao, setDataInspecao] = useState(todayISO)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: true; diagId: string } | { ok: false; error: string } | null>(null)
  const [iduDrag, setIduDrag] = useState(false)
  const [oduDrag, setOduDrag] = useState(false)
  const iduRef = useRef<HTMLInputElement>(null)
  const oduRef = useRef<HTMLInputElement>(null)

  function handleFile(type: 'idu' | 'odu', file: File | undefined) {
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
        const body: Parameters<typeof criarDiagnosticoLgmv>[0] = { equipamentoId }
        if (osId) body.osId = osId
        if (dataInspecao) body.dataInspecao = dataInspecao
        if (iduFile) {
          body.iduCsv = await readFileAsText(iduFile)
          body.arquivoIduNome = iduFile.name
        }
        if (oduFile) {
          body.oduCsv = await readFileAsText(oduFile)
          body.arquivoOduNome = oduFile.name
        }

        const res = await criarDiagnosticoLgmv(body)
        if (!res.ok) {
          setResult({ ok: false, error: res.error ?? 'Erro ao processar diagnóstico.' })
          return
        }
        setResult({ ok: true, diagId: res.id })
        onSuccess?.(res.id)
        setIduFile(null)
        setOduFile(null)
        setDataInspecao(todayISO())
        router.refresh()
      } catch {
        setResult({ ok: false, error: 'Erro inesperado. Tente novamente.' })
      }
    })
  }

  function DropZone({ type, file, setFile, isDragging, setDragging, inputRef }: {
    type: 'idu' | 'odu'
    file: File | null
    setFile: (f: File | null) => void
    isDragging: boolean
    setDragging: (v: boolean) => void
    inputRef: React.RefObject<HTMLInputElement | null>
  }) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Arquivo {type.toUpperCase()}</p>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(type, e.dataTransfer.files?.[0]) }}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            file || isDragging
              ? 'border-primary/40 bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-primary/5'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(type, e.target.files?.[0])}
          />
          {file ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-primary shrink-0" />
                <span className="text-xs text-gray-700 truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="shrink-0 text-gray-400 hover:text-destructive"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload size={18} className={isDragging ? 'text-primary' : 'text-gray-300'} />
              <span className="text-xs text-gray-400">Clique ou arraste</span>
              <span className="text-[10px] text-gray-300">{type.toUpperCase()}*.csv</span>
            </div>
          )}
        </div>
      </div>
    )
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
        {/* Data de inspeção */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
            <Calendar size={11} /> Data da Inspeção
          </label>
          <input
            type="date"
            value={dataInspecao}
            onChange={(e) => setDataInspecao(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DropZone
            type="idu" file={iduFile} setFile={setIduFile}
            isDragging={iduDrag} setDragging={setIduDrag} inputRef={iduRef}
          />
          <DropZone
            type="odu" file={oduFile} setFile={setOduFile}
            isDragging={oduDrag} setDragging={setOduDrag} inputRef={oduRef}
          />
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
