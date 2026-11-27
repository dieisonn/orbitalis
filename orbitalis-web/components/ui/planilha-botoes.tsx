'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

type Resultado = {
  simulacao: boolean; total: number; criados: number; atualizados: number; semAlteracao: number; ajustesEstoque: number
  erros: { linha: number; mensagem: string }[]; avisos: { linha: number; mensagem: string }[]
}

/** Exportar / Baixar modelo / Importar (.xlsx) com pré-visualização antes de gravar. */
export function PlanilhaBotoes({ recurso, nome, estoque = false }: { recurso: 'catalogo-servicos' | 'produtos'; nome: string; estoque?: boolean }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [aberto, setAberto] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [res, setRes] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [gravado, setGravado] = useState(false)

  async function enviar(f: File, simular: boolean) {
    setOcupado(true); setErro(null)
    try {
      const fd = new FormData(); fd.append('arquivo', f); fd.append('simular', String(simular))
      const r = await fetch(`/api/planilhas/${recurso}/importar`, { method: 'POST', body: fd })
      const corpo = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(corpo.message ?? 'Não foi possível importar'); setRes(null); return }
      setRes(corpo)
      if (!simular) { setGravado(true); router.refresh() }
    } catch { setErro('Falha de conexão. Tente de novo.') } finally { setOcupado(false) }
  }
  function escolher(f?: File) {
    if (!f) return
    setArquivo(f); setRes(null); setGravado(false); enviar(f, true)
  }
  function fechar() { setAberto(false); setArquivo(null); setRes(null); setErro(null); setGravado(false); if (input.current) input.current.value = '' }

  const btn = 'inline-flex items-center gap-2 px-3 py-2 border border-border bg-white text-sm font-medium text-gray-700 rounded-lg hover:bg-surface'
  const gravaveis = res ? res.criados + res.atualizados : 0

  return (
    <>
      <a href={`/api/planilhas/${recurso}/exportar`} className={btn}><Download size={14} /> Exportar</a>
      <button type="button" onClick={() => setAberto(true)} className={btn}><Upload size={14} /> Importar</button>

      {aberto && (
        <Modal titulo={`Importar ${nome}`} onFechar={fechar} largura="max-w-xl">
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Envie uma planilha <strong>.xlsx</strong> no mesmo formato da exportação ou do modelo.
              {estoque
                ? ' Produto com código que já existe é atualizado (o saldo não muda); produto novo entra com o estoque informado como saldo inicial.'
                : ' Serviço com código que já existe é atualizado; os demais são criados.'}
            </p>
            <a href={`/api/planilhas/${recurso}/modelo-importacao`} className="inline-flex items-center gap-2 text-primary font-medium hover:underline"><FileSpreadsheet size={14} /> Baixar planilha modelo</a>

            <input ref={input} type="file" accept=".xlsx" onChange={(e) => escolher(e.target.files?.[0])} className="block w-full text-sm" aria-label="Arquivo .xlsx" />

            {ocupado && <p className="flex items-center gap-2 text-gray-500"><Loader2 size={14} className="animate-spin" /> Processando…</p>}
            {erro && <p role="alert" className="text-red-600">{erro}</p>}

            {res && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 font-medium text-gray-900">
                  {gravado ? <CheckCircle2 size={16} className="text-green-600" /> : null}
                  {gravado ? 'Importação concluída' : 'Pré-visualização (nada foi gravado ainda)'}
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  <li className="rounded-lg bg-surface px-3 py-2">Linhas lidas: <strong>{res.total}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">{gravado ? 'Criados' : 'Serão criados'}: <strong>{res.criados}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">{gravado ? 'Atualizados' : 'Serão atualizados'}: <strong>{res.atualizados}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">Sem alteração: <strong>{res.semAlteracao}</strong></li>
                </ul>
                {res.erros.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="flex items-center gap-2 font-medium text-red-700"><AlertTriangle size={14} /> {res.erros.length} linha(s) com problema (serão ignoradas)</p>
                    <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700 space-y-1">
                      {res.erros.slice(0, 100).map((e, i) => <li key={i}>Linha {e.linha}: {e.mensagem}</li>)}
                    </ul>
                  </div>
                )}
                {res.avisos.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-amber-800">{res.avisos.length} aviso(s)</p>
                    <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-amber-800 space-y-1">
                      {res.avisos.slice(0, 100).map((e, i) => <li key={i}>Linha {e.linha}: {e.mensagem}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={fechar} className="px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-surface">{gravado ? 'Fechar' : 'Cancelar'}</button>
                  {!gravado && (
                    <button type="button" disabled={ocupado || gravaveis === 0 || !arquivo} onClick={() => arquivo && enviar(arquivo, false)}
                      className="px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 disabled:opacity-50">
                      Importar {gravaveis} item(ns)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
