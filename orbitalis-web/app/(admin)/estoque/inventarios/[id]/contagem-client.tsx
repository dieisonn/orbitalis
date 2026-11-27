'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Printer, Search } from 'lucide-react'
import { Modal, inputCls } from '@/components/ui/modal'
import { brl, qtd, dataHora, type InventarioDetalhe, type InventarioItem } from '@/lib/suprimentos'
import { cancelarInventario, concluirInventario, contarItens } from '../actions'

type Filtro = 'todos' | 'pendentes' | 'divergentes'

export function ContagemClient({ inv, custos }: { inv: InventarioDetalhe; custos: Record<string, number> }) {
  const router = useRouter()
  const aberto = inv.status === 'aberto'
  const [pendente, iniciar] = useTransition()
  // valor digitado por item ('' = não contado) e status de gravação
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(inv.itens.map((i) => [i.id, i.contado == null ? '' : String(i.contado)])))
  const [salvando, setSalvando] = useState<Record<string, 'salvando' | 'ok' | 'erro'>>({})
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [fechar, setFechar] = useState(false)
  const [naoContados, setNaoContados] = useState<'manter' | 'zerar'>('manter')
  const [erro, setErro] = useState<string | null>(null)
  const gravado = useRef<Record<string, string>>(Object.fromEntries(inv.itens.map((i) => [i.id, i.contado == null ? '' : String(i.contado)])))

  const contadoNum = (i: InventarioItem) => (valores[i.id] === '' || valores[i.id] == null ? null : Number(valores[i.id].replace(',', '.')))
  // diferença contra o saldo do sistema na abertura (o fechamento usa o saldo da hora, por isso avisamos movimentações)
  const diff = (i: InventarioItem) => { const c = contadoNum(i); return c == null ? null : Math.round((c - i.saldoSistema) * 1000) / 1000 }

  const totais = useMemo(() => {
    let contados = 0, sobras = 0, faltas = 0, valor = 0, mexeu = 0
    for (const i of inv.itens) {
      const c = valores[i.id] === '' ? null : Number(String(valores[i.id]).replace(',', '.'))
      if (c == null || Number.isNaN(c)) continue
      contados++
      const d = c - i.saldoSistema
      if (Math.abs(d) > 1e-9) { if (d > 0) sobras++; else faltas++; valor += d * (custos[i.produto.id] ?? 0) }
      if (Math.abs(i.produto.saldo - i.saldoSistema) > 1e-9) mexeu++
    }
    return { contados, sobras, faltas, valor, mexeu }
  }, [valores, inv.itens, custos])

  const visiveis = inv.itens.filter((i) => {
    if (busca) {
      const t = busca.toLowerCase()
      if (![i.produto.nome, i.produto.codigoInterno, i.produto.marca, i.produto.localizacao, i.produto.categoria].some((x) => x?.toLowerCase().includes(t))) return false
    }
    if (filtro === 'pendentes') return valores[i.id] === ''
    if (filtro === 'divergentes') { const d = diff(i); return d != null && d !== 0 }
    return true
  })

  async function gravar(i: InventarioItem, valor: string) {
    if (!aberto || gravado.current[i.id] === valor) return
    const n = valor === '' ? null : Number(valor.replace(',', '.'))
    if (n != null && (Number.isNaN(n) || n < 0)) { setSalvando((s) => ({ ...s, [i.id]: 'erro' })); return }
    setSalvando((s) => ({ ...s, [i.id]: 'salvando' }))
    const r = await contarItens(inv.id, [{ itemId: i.id, contado: n }])
    if (r.ok) { gravado.current[i.id] = valor; setSalvando((s) => ({ ...s, [i.id]: 'ok' })) } else setSalvando((s) => ({ ...s, [i.id]: 'erro' }))
  }

  const confere = (i: InventarioItem) => { const v = String(i.saldoSistema); setValores((x) => ({ ...x, [i.id]: v })); void gravar(i, v) }

  function concluir() {
    setErro(null)
    iniciar(async () => { const r = await concluirInventario(inv.id, naoContados); if (r.ok) { setFechar(false); router.refresh() } else setErro(r.erro) })
  }
  function cancelar() {
    if (!confirm('Cancelar este inventário? Nada será ajustado no estoque.')) return
    iniciar(async () => { const r = await cancelarInventario(inv.id); if (r.ok) router.push('/estoque/inventarios'); else alert(r.erro) })
  }

  const pct = inv.itens.length ? Math.round((totais.contados / inv.itens.length) * 100) : 0
  const cega = inv.contagemCega && aberto

  return (
    <div className="pb-24">
      <Link href="/estoque/inventarios" className="text-sm text-gray-600 hover:underline">← Inventários</Link>
      <div className="flex flex-wrap items-start justify-between gap-3 mt-2 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">#{inv.numero} · {inv.titulo}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {aberto ? 'Em contagem' : inv.status === 'concluido' ? `Concluído em ${dataHora(inv.concluidoEm as string)}` : 'Cancelado'}
            {inv.contagemCega ? ' · contagem cega' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/estoque/inventarios/${inv.id}/folha`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface bg-white">
            <Printer size={14} /> Folha de contagem
          </Link>
          {aberto && <button onClick={cancelar} disabled={pendente} className="px-3 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface bg-white">Cancelar inventário</button>}
          {aberto && <button onClick={() => { setErro(null); setFechar(true) }} className="px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90">Conferir e concluir</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-border p-3"><p className="text-xs font-semibold uppercase text-gray-500">Contados</p><p className="text-xl font-bold text-gray-900">{totais.contados} <span className="text-sm font-normal text-gray-500">de {inv.itens.length}</span></p>
          <div className="h-1.5 mt-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-action" style={{ width: `${pct}%` }} /></div></div>
        <div className="bg-white rounded-xl border border-border p-3"><p className="text-xs font-semibold uppercase text-gray-500">Sobras</p><p className="text-xl font-bold text-green-700">{totais.sobras}</p></div>
        <div className="bg-white rounded-xl border border-border p-3"><p className="text-xs font-semibold uppercase text-gray-500">Faltas</p><p className="text-xl font-bold text-red-700">{totais.faltas}</p></div>
        <div className="bg-white rounded-xl border border-border p-3"><p className="text-xs font-semibold uppercase text-gray-500">Diferença estimada</p><p className={`text-xl font-bold ${totais.valor < 0 ? 'text-red-700' : 'text-gray-900'}`}>{cega ? '—' : brl(totais.valor)}</p></div>
      </div>

      {aberto && totais.mexeu > 0 && !cega && (
        <p className="mb-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
          {totais.mexeu} produto(s) tiveram movimentação de estoque depois da abertura do inventário. Ao concluir, o ajuste usa o saldo de agora.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[12rem] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto, código, local…" className={`${inputCls} pl-9`} aria-label="Buscar item" />
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Filtro">
          {(['todos', 'pendentes', 'divergentes'] as Filtro[]).filter((f) => !(cega && f === 'divergentes')).map((f) => (
            <button key={f} role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)}
              className={`px-3 py-2 text-sm font-semibold rounded-lg border ${filtro === f ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border hover:bg-surface'}`}>
              {f === 'todos' ? 'Todos' : f === 'pendentes' ? 'Pendentes' : 'Divergentes'}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {visiveis.map((i) => {
          const d = diff(i)
          const st = salvando[i.id]
          return (
            <li key={i.id} className="bg-white rounded-xl border border-border p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-medium text-gray-900">{i.produto.nome}</p>
                <p className="text-xs text-gray-500">
                  {[i.produto.localizacao && `Local ${i.produto.localizacao}`, i.produto.codigoInterno, i.produto.marca, i.produto.categoria].filter(Boolean).join(' · ') || `#${i.produto.numero}`}
                </p>
              </div>
              {!cega && <div className="text-right text-sm"><p className="text-xs text-gray-500">Sistema</p><p className="font-semibold text-gray-900">{qtd(i.saldoSistema)} {i.produto.unidade}</p></div>}
              {aberto ? (
                <div className="flex items-center gap-2">
                  <input
                    inputMode="decimal" aria-label={`Quantidade contada de ${i.produto.nome}`} value={valores[i.id] ?? ''} placeholder="—"
                    onChange={(e) => setValores((x) => ({ ...x, [i.id]: e.target.value }))}
                    onBlur={(e) => void gravar(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    className="w-24 px-3 py-2.5 border border-border rounded-lg text-base text-right font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-sm text-gray-500 w-8">{i.produto.unidade}</span>
                  {!cega && <button onClick={() => confere(i)} title="Confere com o sistema" className="p-2 text-green-700 border border-green-200 rounded-lg hover:bg-green-50" aria-label={`Confere: ${i.produto.nome}`}><Check size={16} /></button>}
                  <span className="w-5" aria-live="polite">{st === 'salvando' ? <Loader2 size={14} className="animate-spin text-gray-400" /> : st === 'ok' ? <Check size={14} className="text-green-600" /> : st === 'erro' ? <span className="text-destructive text-xs">!</span> : null}</span>
                </div>
              ) : (
                <div className="text-right text-sm"><p className="text-xs text-gray-500">Contado</p><p className="font-semibold">{i.contado == null ? 'não contado' : `${qtd(i.contado)} ${i.produto.unidade}`}</p></div>
              )}
              {!cega && d != null && d !== 0 && (
                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${d > 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{d > 0 ? '+' : ''}{qtd(d)}</span>
              )}
              {!aberto && i.ajusteAplicado != null && <span className="text-xs text-gray-600">ajuste aplicado {i.ajusteAplicado > 0 ? '+' : ''}{qtd(i.ajusteAplicado)}</span>}
            </li>
          )
        })}
        {visiveis.length === 0 && <li className="text-center text-sm text-gray-500 py-8">Nenhum item neste filtro.</li>}
      </ul>

      {fechar && (
        <Modal titulo="Concluir inventário" onFechar={() => setFechar(false)} largura="max-w-md">
          <div className="space-y-3 text-sm text-gray-700">
            <p><b>{totais.contados}</b> de {inv.itens.length} itens contados · <b className="text-green-700">{totais.sobras}</b> sobra(s) · <b className="text-red-700">{totais.faltas}</b> falta(s).</p>
            {!cega && <p>Diferença estimada a custo: <b>{brl(totais.valor)}</b></p>}
            <p>Ao concluir, o saldo de cada produto contado passa a ser a quantidade contada, com registro no histórico de estoque. Isso não pode ser desfeito.</p>
            {inv.itens.length - totais.contados > 0 && (
              <fieldset className="border border-border rounded-lg p-3">
                <legend className="px-1 text-xs font-semibold text-gray-600">{inv.itens.length - totais.contados} item(ns) sem contagem</legend>
                <label className="flex items-center gap-2 mb-1 cursor-pointer"><input type="radio" checked={naoContados === 'manter'} onChange={() => setNaoContados('manter')} /> Manter o saldo atual do sistema</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={naoContados === 'zerar'} onChange={() => setNaoContados('zerar')} /> Considerar zero (não encontrados)</label>
              </fieldset>
            )}
          </div>
          {erro && <p role="alert" className="mt-3 text-sm text-destructive">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setFechar(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Voltar</button>
            <button onClick={concluir} disabled={pendente} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90 disabled:opacity-60">
              {pendente && <Loader2 size={14} className="animate-spin" />} Concluir e ajustar estoque
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
