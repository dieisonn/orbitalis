'use client'

import { useRef, useState } from 'react'
import { Upload, X, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2, Download } from 'lucide-react'
import { readSheet } from 'read-excel-file/browser'
import { importarLote, type ResultadoLinha } from '@/app/(admin)/clientes/actions'
import { consolidar, type ResumoLeitura } from '@/lib/importar-clientes'

const LOTE = 100

// CSV simples (aceita ; ou , e aspas), para quem exporta de outros sistemas
function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '')
  const primeira = t.split(/\r?\n/, 1)[0] ?? ''
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((x) => x.trim())) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim())) linhas.push(linha)
  return linhas
}

const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`

type Etapa = 'inicio' | 'lendo' | 'previa' | 'importando' | 'fim'

export function ImportarClientesButton() {
  const [aberto, setAberto] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [leitura, setLeitura] = useState<ResumoLeitura | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [feitos, setFeitos] = useState(0)
  const [resultados, setResultados] = useState<ResultadoLinha[]>([])
  const [mostrarAvisos, setMostrarAvisos] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function reiniciar() {
    setEtapa('inicio'); setLeitura(null); setErro(null); setFeitos(0); setResultados([]); setMostrarAvisos(false)
    if (inputRef.current) inputRef.current.value = ''
  }
  function fechar() { if (etapa !== 'importando') { setAberto(false); reiniciar() } }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    if (arquivos.length === 0) return
    setErro(null); setEtapa('lendo')
    const porArquivo: { arquivo: string; linhas: unknown[][] }[] = []
    const ignorados: { arquivo: string; motivo: string }[] = []
    for (const f of arquivos) {
      try {
        if (/\.csv$/i.test(f.name)) porArquivo.push({ arquivo: f.name, linhas: lerCsv(await f.text()) })
        else if (/\.xlsx$/i.test(f.name)) porArquivo.push({ arquivo: f.name, linhas: (await readSheet(f)) as unknown[][] })
        else ignorados.push({ arquivo: f.name, motivo: 'Formato não suportado (use .xlsx ou .csv; salve .xls como .xlsx)' })
      } catch {
        ignorados.push({ arquivo: f.name, motivo: 'Não consegui abrir o arquivo' })
      }
    }
    const r = consolidar(porArquivo, ignorados)
    if (r.clientes.length === 0) {
      setErro(r.arquivosIgnorados.length
        ? r.arquivosIgnorados.map((a) => `${a.arquivo}: ${a.motivo}`).join(' · ')
        : 'Nenhum cliente encontrado nas planilhas.')
      setEtapa('inicio')
      return
    }
    setLeitura(r); setEtapa('previa')
  }

  async function importar() {
    if (!leitura) return
    setEtapa('importando'); setFeitos(0)
    const todos: ResultadoLinha[] = []
    const lista = leitura.clientes
    for (let i = 0; i < lista.length; i += LOTE) {
      const pedaco = lista.slice(i, i + LOTE)
      const r = await importarLote(pedaco.map(({ origem: _o, ...c }) => c))
      if ('error' in r) {
        pedaco.forEach((c, k) => todos.push({ linha: i + k + 1, nome: c.razaoSocial, status: 'erro', mensagem: r.error }))
      } else {
        r.resultados.forEach((x) => todos.push({ ...x, linha: i + x.linha }))
      }
      setFeitos(Math.min(i + LOTE, lista.length))
    }
    setResultados(todos); setEtapa('fim')
  }

  function baixarRelatorio() {
    const linhas = [['Cliente', 'Resultado', 'Detalhe', 'Origem']]
    resultados.forEach((r) => linhas.push([r.nome, r.status, r.mensagem ?? '', leitura?.clientes[r.linha - 1]?.origem ?? '']))
    leitura?.avisos.forEach((a) => linhas.push([a.nome, 'aviso', a.texto, a.origem]))
    const csv = '﻿' + linhas.map((l) => l.map(escCsv).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'resultado-importacao-clientes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const criados = resultados.filter((r) => r.status === 'criado').length
  const ignorados = resultados.filter((r) => r.status === 'ignorado')
  const erros = resultados.filter((r) => r.status === 'erro')
  const comAviso = resultados.filter((r) => r.status === 'criado' && r.mensagem)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-md border border-border hover:bg-surface transition-colors"
      >
        <Upload size={14} />
        Importar planilha
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fechar} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-gray-900">Importar clientes de planilhas</h2>
              <button onClick={fechar} disabled={etapa === 'importando'} className="text-gray-500 hover:text-gray-900 p-1 rounded disabled:opacity-40" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {etapa === 'inicio' && (
                <>
                  <p className="text-sm text-gray-700">
                    Escolha uma ou várias planilhas <strong>.xlsx</strong> (ou .csv). As colunas são reconhecidas pelo nome:
                    Nome, Razão social, CPF, CNPJ, Telefone, Celular, E-mail, CEP, Logradouro, Número, Complemento, Bairro, Cidade e Estado.
                    Só o nome é obrigatório.
                  </p>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/40 hover:bg-surface/50 transition-colors">
                    <FileSpreadsheet size={28} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Clique para escolher as planilhas (pode selecionar várias)</span>
                    <input ref={inputRef} type="file" multiple accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={aoEscolher} />
                  </label>
                  {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{erro}</p>}
                  <p className="text-xs text-gray-500">
                    Clientes que já existem (mesmo CPF/CNPJ, ou mesmo nome e cidade quando não há documento) são ignorados, então pode importar de novo sem duplicar.
                  </p>
                </>
              )}

              {etapa === 'lendo' && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-sm text-gray-600">Lendo as planilhas…</p>
                </div>
              )}

              {etapa === 'previa' && leitura && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden">
                    {[
                      ['Clientes a importar', leitura.clientes.length],
                      ['Sem CPF/CNPJ', leitura.semDocumento],
                      ['Repetidos juntados', leitura.mesclados],
                      ['Avisos', leitura.avisos.length],
                    ].map(([l, n]) => (
                      <div key={l as string} className="bg-white px-3 py-2.5">
                        <p className="text-xs text-gray-500">{l}</p>
                        <p className="text-xl font-semibold tabular-nums text-gray-900">{n}</p>
                      </div>
                    ))}
                  </div>

                  {leitura.arquivosIgnorados.length > 0 && (
                    <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {leitura.arquivosIgnorados.map((a) => <p key={a.arquivo}><strong>{a.arquivo}</strong>: {a.motivo}</p>)}
                    </div>
                  )}

                  {leitura.avisos.length > 0 && (
                    <div>
                      <button type="button" onClick={() => setMostrarAvisos((v) => !v)} className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1.5">
                        <AlertTriangle size={14} /> {mostrarAvisos ? 'Esconder' : 'Ver'} {leitura.avisos.length} aviso(s)
                      </button>
                      {mostrarAvisos && (
                        <ul className="mt-2 text-sm text-gray-700 space-y-1 max-h-40 overflow-y-auto border border-border rounded-md p-3">
                          {leitura.avisos.map((a, i) => (
                            <li key={i}><strong>{a.nome}</strong>: {a.texto} <span className="text-gray-500">— {a.origem}</span></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="border border-border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 border-b border-border bg-surface">
                          {['Cliente', 'CPF/CNPJ', 'Cidade', 'Telefone', 'E-mail'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {leitura.clientes.slice(0, 15).map((c, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-gray-900 min-w-[200px]">{c.razaoSocial}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-700">{c.documento ?? <span className="text-gray-400">—</span>}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ''}` : '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{c.celular ?? c.telefone ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{c.email ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {leitura.clientes.length > 15 && <p className="text-xs text-gray-500">… e mais {leitura.clientes.length - 15} cliente(s).</p>}
                </>
              )}

              {etapa === 'importando' && leitura && (
                <div className="py-8 space-y-3">
                  <p className="text-sm text-gray-700 text-center">Importando {feitos} de {leitura.clientes.length} clientes…</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-action transition-all" style={{ width: `${(feitos / leitura.clientes.length) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 text-center">Não feche esta janela.</p>
                </div>
              )}

              {etapa === 'fim' && (
                <>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={16} /> {criados} importado(s)</span>
                    {ignorados.length > 0 && <span className="text-gray-600">{ignorados.length} já existiam</span>}
                    {erros.length > 0 && <span className="text-red-700">{erros.length} com erro</span>}
                  </div>
                  {[...erros, ...comAviso, ...ignorados].length > 0 && (
                    <div className="border border-border rounded-md overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-border/70">
                          {[...erros, ...comAviso, ...ignorados].map((r, i) => (
                            <tr key={i} className={r.status === 'erro' ? 'bg-red-50/60' : ''}>
                              <td className="px-3 py-2 font-medium text-gray-900">{r.nome}</td>
                              <td className="px-3 py-2 text-gray-600">{r.mensagem}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Os clientes entram sem acesso ao portal. Para liberar, use “Convidar” na lista. Quem ficou sem CPF/CNPJ pode ter o documento completado em “Editar”.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border">
              {etapa === 'previa' && (
                <>
                  <button type="button" onClick={reiniciar} className="px-3 py-2 text-sm text-gray-700 rounded-md border border-border hover:bg-surface">Escolher outros arquivos</button>
                  <button type="button" onClick={importar} className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-md hover:bg-action/90">
                    Importar {leitura?.clientes.length} cliente(s)
                  </button>
                </>
              )}
              {etapa === 'fim' && (
                <>
                  <button type="button" onClick={baixarRelatorio} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 rounded-md border border-border hover:bg-surface">
                    <Download size={14} /> Baixar relatório
                  </button>
                  <button type="button" onClick={fechar} className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-md hover:bg-action/90">Concluir</button>
                </>
              )}
              {(etapa === 'inicio' || etapa === 'lendo') && (
                <button type="button" onClick={fechar} className="ml-auto px-3 py-2 text-sm text-gray-700 rounded-md border border-border hover:bg-surface">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
