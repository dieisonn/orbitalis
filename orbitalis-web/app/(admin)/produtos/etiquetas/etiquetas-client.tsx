'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import JsBarcode from 'jsbarcode'
import { Loader2, Printer } from 'lucide-react'
import { Campo, inputCls } from '@/components/ui/modal'
import { brl, type Produto } from '@/lib/suprimentos'
import { produtosParaEtiquetas, type SelecaoProdutos } from '../actions'

type Formato = { id: string; nome: string; folha: boolean; cols: number; rows: number; w: number; h: number; gapX: number; gapY: number; top: number; left: number }
// medidas em mm. Folha A4: margens calculadas para centralizar; podem ser ajustadas na tela.
const FORMATOS: Formato[] = [
  { id: 'a4-3x10', nome: 'Folha A4 — 3 × 10 (66 × 25 mm, 30 por folha)', folha: true, cols: 3, rows: 10, w: 66, h: 25, gapX: 3, gapY: 0, top: 23.5, left: 3 },
  { id: 'a4-2x7', nome: 'Folha A4 — 2 × 7 (99 × 38 mm, 14 por folha)', folha: true, cols: 2, rows: 7, w: 99, h: 38, gapX: 3, gapY: 0, top: 15.5, left: 3 },
  { id: 'a4-2x4', nome: 'Folha A4 — 2 × 4 (99 × 67 mm, 8 por folha)', folha: true, cols: 2, rows: 4, w: 99, h: 67, gapX: 3, gapY: 0, top: 14.5, left: 3 },
  { id: 'rolo-60x40', nome: 'Rolo térmico — 60 × 40 mm', folha: false, cols: 1, rows: 1, w: 60, h: 40, gapX: 0, gapY: 0, top: 0, left: 0 },
  { id: 'rolo-100x30', nome: 'Rolo térmico — 100 × 30 mm', folha: false, cols: 1, rows: 1, w: 100, h: 30, gapX: 0, gapY: 0, top: 0, left: 0 },
]

const MAX_ETIQUETAS = 3000
const eanValido = (v: string) => {
  if (!/^\d{13}$/.test(v)) return false
  const s = v.slice(0, 12).split('').reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0)
  return (10 - (s % 10)) % 10 === Number(v[12])
}
const valorBarras = (p: Produto) => (p.codigoBarras || p.codigoInterno || String(p.numero)).trim()

function Barras({ valor }: { valor: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    try {
      JsBarcode(el, valor, { format: eanValido(valor) ? 'EAN13' : 'CODE128', displayValue: false, margin: 0, height: 40, width: 2 })
      const w = el.getAttribute('width'), h = el.getAttribute('height')
      if (w && h) el.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`)
      el.removeAttribute('width'); el.removeAttribute('height')
      el.setAttribute('preserveAspectRatio', 'none')
    } catch { el.innerHTML = '' }
  }, [valor])
  return <svg ref={ref} className="w-full h-full block" aria-label={`Código de barras ${valor}`} role="img" />
}

type Opcoes = { nome: boolean; codigo: boolean; preco: boolean; barras: boolean }

function Etiqueta({ p, f, o }: { p: Produto; f: Formato; o: Opcoes }) {
  const valor = valorBarras(p)
  const pequena = f.h <= 30
  return (
    <div style={{ width: `${f.w}mm`, height: `${f.h}mm`, padding: '1.2mm 2mm', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      {o.nome && <div style={{ fontSize: pequena ? '7pt' : '9pt', fontWeight: 700, lineHeight: 1.1, maxHeight: pequena ? '2.3em' : '3.4em', overflow: 'hidden' }}>{p.nome}</div>}
      {o.barras && <div style={{ flex: 1, minHeight: 0, margin: '0.6mm 0' }}><Barras valor={valor} /></div>}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2mm' }}>
        {o.codigo ? <span style={{ fontSize: pequena ? '6.5pt' : '8pt', letterSpacing: '0.03em' }}>{valor}</span> : <span />}
        {o.preco && <span style={{ fontSize: pequena ? '10pt' : '14pt', fontWeight: 800 }}>{brl(p.precoVenda)}</span>}
      </div>
    </div>
  )
}

export function EtiquetasClient() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [formatoId, setFormatoId] = useState('a4-3x10')
  const [opcoes, setOpcoes] = useState<Opcoes>({ nome: true, codigo: true, preco: true, barras: true })
  const [qtdPadrao, setQtdPadrao] = useState(1)
  const [usarSaldo, setUsarSaldo] = useState(false)
  const [qtds, setQtds] = useState<Record<string, number>>({})
  const [ajuste, setAjuste] = useState<{ top: number; left: number } | null>(null)
  const formatoBase = FORMATOS.find((f) => f.id === formatoId)!
  const formato = { ...formatoBase, ...(ajuste ?? {}) }

  useEffect(() => {
    let sel: SelecaoProdutos | null = null
    try { sel = JSON.parse(sessionStorage.getItem('orbitalis_etiquetas_sel') ?? 'null') } catch { /* sem seleção */ }
    if (!sel) { setProdutos([]); return }
    produtosParaEtiquetas(sel).then((r) => { if (r.ok) setProdutos(r.produtos); else { setErro(r.erro); setProdutos([]) } })
  }, [])

  const qtdDe = (p: Produto) => qtds[p.id] ?? (usarSaldo ? Math.max(0, Math.round(Number(p.saldo))) : qtdPadrao)
  const todas = useMemo(() => (produtos ?? []).flatMap((p) => Array.from({ length: Math.min(qtdDe(p), 500) }, () => p)), [produtos, qtds, qtdPadrao, usarSaldo]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = todas.length
  const etiquetas = todas.slice(0, MAX_ETIQUETAS)
  const porFolha = formato.cols * formato.rows
  const folhas = formato.folha ? Array.from({ length: Math.ceil(etiquetas.length / porFolha) }, (_, i) => etiquetas.slice(i * porFolha, (i + 1) * porFolha)) : etiquetas.map((e) => [e])

  if (produtos === null) return <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando produtos…</p>
  if (produtos.length === 0) return (
    <div className="bg-white rounded-xl border border-border p-6 text-sm text-gray-700">
      {erro ?? 'Nenhum produto selecionado.'} <Link href="/produtos" className="text-primary font-medium hover:underline">Voltar à lista e marcar os produtos</Link>.
    </div>
  )

  const pageCss = formato.folha ? '@page { size: A4; margin: 0 }' : `@page { size: ${formato.w}mm ${formato.h}mm; margin: 0 }`

  return (
    <>
      <style>{`${pageCss}
        @media print {
          body * { visibility: hidden !important; }
          #area-etiquetas, #area-etiquetas * { visibility: visible !important; }
          #area-etiquetas { position: absolute; left: 0; top: 0; width: auto; }
          .folha-etiq { box-shadow: none !important; margin: 0 !important; break-after: page; }
          .folha-etiq:last-child { break-after: auto; }
        }`}</style>

      <div className="grid grid-cols-1 xl:grid-cols-[22rem_1fr] gap-6 items-start">
        <div className="space-y-4 print:hidden">
          <section className="bg-white rounded-xl border border-border p-4 space-y-3">
            <Campo rotulo="Formato">
              <select value={formatoId} onChange={(e) => { setFormatoId(e.target.value); setAjuste(null) }} className={inputCls}>{FORMATOS.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
            </Campo>
            {formato.folha && (
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Margem superior (mm)"><input type="number" step="0.5" value={formato.top} onChange={(e) => setAjuste({ top: Number(e.target.value), left: formato.left })} className={inputCls} /></Campo>
                <Campo rotulo="Margem esquerda (mm)"><input type="number" step="0.5" value={formato.left} onChange={(e) => setAjuste({ top: formato.top, left: Number(e.target.value) })} className={inputCls} /></Campo>
                <p className="col-span-2 text-xs text-gray-500">Se a impressão sair deslocada em relação à sua folha de etiquetas, ajuste as margens. Imprima com escala 100% (sem “ajustar à página”).</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {([['nome', 'Nome'], ['barras', 'Código de barras'], ['codigo', 'Código (texto)'], ['preco', 'Preço de venda']] as const).map(([k, r]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={opcoes[k]} onChange={(e) => setOpcoes({ ...opcoes, [k]: e.target.checked })} className="h-4 w-4 accent-[var(--color-action)]" /> {r}</label>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Quantidade de etiquetas</h2>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={usarSaldo} onChange={(e) => { setUsarSaldo(e.target.checked); setQtds({}) }} className="h-4 w-4 accent-[var(--color-action)]" /> Uma por unidade em estoque</label>
            {!usarSaldo && <Campo rotulo="Quantidade por produto"><input type="number" min={1} max={500} value={qtdPadrao} onChange={(e) => { setQtdPadrao(Math.max(1, Number(e.target.value) || 1)); setQtds({}) }} className={inputCls} /></Campo>}
            <ul className="max-h-64 overflow-y-auto divide-y divide-border text-sm">
              {produtos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="truncate" title={p.nome}>{p.nome}</span>
                  <input type="number" min={0} max={500} value={qtdDe(p)} onChange={(e) => setQtds({ ...qtds, [p.id]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`Quantidade de etiquetas de ${p.nome}`} className="w-20 px-2 py-1 border border-border rounded-lg text-right" />
                </li>
              ))}
            </ul>
          </section>

          <button type="button" onClick={() => window.print()} disabled={etiquetas.length === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-50">
            <Printer size={16} /> Imprimir {etiquetas.length} etiqueta(s){formato.folha ? ` em ${folhas.length} folha(s)` : ''}
          </button>
        </div>

        <div className="overflow-auto bg-gray-200 rounded-xl p-4 print:p-0 print:bg-transparent print:overflow-visible">
          <div id="area-etiquetas" className="space-y-4 print:space-y-0">
            {etiquetas.length === 0 && <p className="text-sm text-gray-600 print:hidden">Defina a quantidade de pelo menos um produto.</p>}
            {folhas.map((grupo, i) => (
              <div key={i} className="folha-etiq bg-white shadow"
                style={formato.folha
                  ? { width: '210mm', height: '297mm', boxSizing: 'border-box', paddingTop: `${formato.top}mm`, paddingLeft: `${formato.left}mm`, display: 'grid', gridTemplateColumns: `repeat(${formato.cols}, ${formato.w}mm)`, gridAutoRows: `${formato.h}mm`, columnGap: `${formato.gapX}mm`, rowGap: `${formato.gapY}mm`, alignContent: 'start' }
                  : { width: `${formato.w}mm`, height: `${formato.h}mm` }}>
                {grupo.map((p, k) => <Etiqueta key={k} p={p} f={formato} o={opcoes} />)}
              </div>
            ))}
            {total > MAX_ETIQUETAS && <p className="text-sm text-amber-700 print:hidden">Limite de {MAX_ETIQUETAS} etiquetas por impressão: as demais foram omitidas. Imprima o restante em outra remessa.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
