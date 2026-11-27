'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

type Resultado = {
  simulacao: boolean; total: number; criados: number; atualizados: number; semAlteracao: number; ajustesEstoque: number
  erros: { linha: number; mensagem: string }[]; avisos: { linha: number; mensagem: string }[]
}
type Item = { arquivo: File; res?: Resultado; erro?: string; gravado?: boolean }

/** Exportar / Baixar modelo / Importar (.xlsx, um ou vários arquivos) com pré-visualização antes de gravar. */
export function PlanilhaBotoes({ recurso, nome, estoque = false }: { recurso: 'catalogo-servicos' | 'produtos'; nome: string; estoque?: boolean }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Item[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [gravado, setGravado] = useState(false)

  async function enviar(f: File, simular: boolean): Promise<{ res?: Resultado; erro?: string }> {
    try {
      const fd = new FormData(); fd.append('arquivo', f); fd.append('simular', String(simular))
      const r = await fetch(`/api/planilhas/${recurso}/importar`, { method: 'POST', body: fd })
      const corpo = await r.json().catch(() => ({}))
      if (!r.ok) return { erro: corpo.message ?? 'Não foi possível importar' }
      return { res: corpo }
    } catch { return { erro: 'Falha de conexão. Tente de novo.' } }
  }
  async function escolher(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    const arquivos = Array.from(lista)
    setGravado(false); setOcupado(true); setItens(arquivos.map((arquivo) => ({ arquivo })))
    const out: Item[] = []
    for (const arquivo of arquivos) {
      out.push({ arquivo, ...(await enviar(arquivo, true)) })
      setItens([...out, ...arquivos.slice(out.length).map((a) => ({ arquivo: a }))])
    }
    setOcupado(false)
  }
  async function gravar() {
    setOcupado(true)
    const out: Item[] = []
    for (const it of itens) {
      if (!it.res || it.res.criados + it.res.atualizados === 0) { out.push(it); continue }
      const r = await enviar(it.arquivo, false)
      out.push({ ...it, ...r, gravado: !!r.res })
      setItens([...out, ...itens.slice(out.length)])
    }
    setOcupado(false); setGravado(true); router.refresh()
  }
  function fechar() { setAberto(false); setItens([]); setGravado(false); if (input.current) input.current.value = '' }

  const comRes = itens.filter((i) => i.res)
  const soma = (k: 'total' | 'criados' | 'atualizados' | 'semAlteracao') => comRes.reduce((t, i) => t + (i.res?.[k] ?? 0), 0)
  const erros = comRes.flatMap((i) => i.res!.erros.map((e) => ({ ...e, arquivo: i.arquivo.name })))
  const avisos = comRes.flatMap((i) => i.res!.avisos.map((e) => ({ ...e, arquivo: i.arquivo.name })))
  const gravaveis = soma('criados') + soma('atualizados')
  const prontos = itens.length > 0 && itens.every((i) => i.res || i.erro)
  const multi = itens.length > 1

  const btn = 'inline-flex items-center gap-2 px-3 py-2 border border-border bg-white text-sm font-medium text-gray-700 rounded-lg hover:bg-surface'

  return (
    <>
      <a href={`/api/planilhas/${recurso}/exportar`} className={btn}><Download size={14} /> Exportar</a>
      <button type="button" onClick={() => setAberto(true)} className={btn}><Upload size={14} /> Importar</button>

      {aberto && (
        <Modal titulo={`Importar ${nome}`} onFechar={fechar} largura="max-w-xl">
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Envie planilhas <strong>.xlsx</strong> (uma ou várias) no mesmo formato da exportação ou do modelo.
              {estoque
                ? ' Produto com código que já existe é atualizado (o saldo não muda); produto novo entra com o estoque informado como saldo inicial.'
                : ' Serviço com código que já existe é atualizado; os demais são criados.'}
            </p>
            <a href={`/api/planilhas/${recurso}/modelo-importacao`} className="inline-flex items-center gap-2 text-primary font-medium hover:underline"><FileSpreadsheet size={14} /> Baixar planilha modelo</a>

            <input ref={input} type="file" accept=".xlsx" multiple onChange={(e) => escolher(e.target.files)} className="block w-full text-sm" aria-label="Arquivos .xlsx" />
            <p className="text-xs text-gray-500 -mt-2">Você pode selecionar várias planilhas de uma vez (Ctrl/Shift ao escolher).</p>

            {ocupado && <p className="flex items-center gap-2 text-gray-500"><Loader2 size={14} className="animate-spin" /> Processando…</p>}

            {multi && (
              <ul className="rounded-lg border border-border divide-y divide-border text-xs max-h-40 overflow-y-auto">
                {itens.map((i, k) => (
                  <li key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="truncate">{i.arquivo.name}</span>
                    <span className={`shrink-0 ${i.erro ? 'text-red-600' : 'text-gray-600'}`}>
                      {i.erro ? i.erro : i.res ? `${i.res.criados} novos · ${i.res.atualizados} atualizados${i.res.erros.length ? ` · ${i.res.erros.length} erro(s)` : ''}` : 'aguardando…'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!multi && itens[0]?.erro && <p role="alert" className="text-red-600">{itens[0].erro}</p>}

            {comRes.length > 0 && prontos && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 font-medium text-gray-900">
                  {gravado ? <CheckCircle2 size={16} className="text-green-600" /> : null}
                  {gravado ? 'Importação concluída' : 'Pré-visualização (nada foi gravado ainda)'}
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  <li className="rounded-lg bg-surface px-3 py-2">Linhas lidas: <strong>{soma('total')}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">{gravado ? 'Criados' : 'Serão criados'}: <strong>{soma('criados')}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">{gravado ? 'Atualizados' : 'Serão atualizados'}: <strong>{soma('atualizados')}</strong></li>
                  <li className="rounded-lg bg-surface px-3 py-2">Sem alteração: <strong>{soma('semAlteracao')}</strong></li>
                </ul>
                {erros.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="flex items-center gap-2 font-medium text-red-700"><AlertTriangle size={14} /> {erros.length} linha(s) com problema (serão ignoradas)</p>
                    <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700 space-y-1">
                      {erros.slice(0, 100).map((e, i) => <li key={i}>{multi ? `${e.arquivo} · ` : ''}Linha {e.linha}: {e.mensagem}</li>)}
                    </ul>
                  </div>
                )}
                {avisos.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-amber-800">{avisos.length} aviso(s)</p>
                    <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-amber-800 space-y-1">
                      {avisos.slice(0, 100).map((e, i) => <li key={i}>{multi ? `${e.arquivo} · ` : ''}Linha {e.linha}: {e.mensagem}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={fechar} className="px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-surface">{gravado ? 'Fechar' : 'Cancelar'}</button>
                  {!gravado && (
                    <button type="button" disabled={ocupado || gravaveis === 0} onClick={gravar}
                      className="px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 disabled:opacity-50">
                      Importar {gravaveis} item(ns){multi ? ` de ${comRes.length} arquivos` : ''}
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
