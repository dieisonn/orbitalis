'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CampoData } from '@/components/ui/campo-data'
import { diaDaSemanaISO, somarDiasISO } from '@/lib/datas'

export type DiaOs = { data: string; horaInicio: string; horaFim: string }

const hora = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'
const campo = 'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'
const ehFimDeSemana = (iso: string) => ['dom', 'sáb', 'sab'].includes(diaDaSemanaISO(iso).toLowerCase().slice(0, 3))

/**
 * Data e horários da O.S. De um dia só: data + início + término. Com "dura mais de um dia": uma linha por dia,
 * cada uma com entrada e saída (a agenda ganha um evento por dia). Envia `dataAgendamento`, `horaInicio`, `horaFim`
 * (do 1º dia) e `diasJson` (lista dos dias, só quando são 2 ou mais) no formulário.
 */
export function HorarioOs({ dataInicial, inicioInicial = '08:00', fimInicial = '10:00', diasIniciais = [] }: {
  dataInicial: string; inicioInicial?: string; fimInicial?: string; diasIniciais?: DiaOs[]
}) {
  const [multi, setMulti] = useState(diasIniciais.length >= 2)
  const [data, setData] = useState(dataInicial)
  const [ini, setIni] = useState(inicioInicial)
  const [fim, setFim] = useState(fimInicial)
  const [dias, setDias] = useState<DiaOs[]>(diasIniciais.length >= 2 ? diasIniciais : [])
  const [qtd, setQtd] = useState('3')
  const [soUteis, setSoUteis] = useState(false)

  function ligar(on: boolean) {
    setMulti(on)
    if (on && dias.length < 2) {
      const primeiro = { data, horaInicio: ini, horaFim: fim }
      setDias([primeiro, { data: somarDiasISO(data, 1), horaInicio: ini, horaFim: fim }])
    }
  }
  const set = (i: number, p: Partial<DiaOs>) => setDias((l) => l.map((d, j) => (j === i ? { ...d, ...p } : d)))

  function gerar() {
    const n = Math.min(60, Math.max(2, Number(qtd) || 2))
    const base = dias[0] ?? { data, horaInicio: ini, horaFim: fim }
    const out: DiaOs[] = []
    let atual = base.data
    while (out.length < n) {
      if (!(soUteis && ehFimDeSemana(atual))) out.push({ data: atual, horaInicio: base.horaInicio, horaFim: base.horaFim })
      atual = somarDiasISO(atual, 1)
    }
    setDias(out)
  }

  const primeiro = multi ? dias[0] : null
  return (
    <div className="space-y-3">
      {/* valores enviados ao formulário */}
      <input type="hidden" name="diasJson" value={multi && dias.length >= 2 ? JSON.stringify(dias) : ''} />
      {multi && primeiro ? (
        <>
          <input type="hidden" name="dataAgendamento" value={primeiro.data} />
          <input type="hidden" name="horaInicio" value={primeiro.horaInicio} />
          <input type="hidden" name="horaFim" value={primeiro.horaFim} />
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Agendamento <span className="text-destructive">*</span>
            </label>
            <input name="dataAgendamento" type="date" required value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Início</label>
              <input name="horaInicio" type="time" value={ini} onChange={(e) => setIni(e.target.value)} className={campo} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Término</label>
              <input name="horaFim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} className={campo} />
            </div>
          </div>
        </>
      )}

      <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
        <input type="checkbox" checked={multi} onChange={(e) => ligar(e.target.checked)} className="h-4 w-4 accent-[var(--color-action)]" />
        Esta O.S. dura mais de um dia <span className="text-xs text-gray-500">(um registro por dia, com entrada e saída)</span>
      </label>

      {multi && (
        <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <label className="text-gray-700">Gerar
              <input type="number" min={2} max={60} value={qtd} onChange={(e) => setQtd(e.target.value)}
                className="ml-2 w-16 px-2 py-1.5 border border-border rounded-lg text-sm" aria-label="Quantidade de dias" /> dias seguidos
            </label>
            <label className="inline-flex items-center gap-1.5 text-gray-700 cursor-pointer">
              <input type="checkbox" checked={soUteis} onChange={(e) => setSoUteis(e.target.checked)} className="h-4 w-4 accent-[var(--color-action)]" /> só dias úteis
            </label>
            <button type="button" onClick={gerar} className="px-3 py-1.5 text-xs font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5">Gerar dias</button>
          </div>

          {dias.map((d, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_5.5rem_5.5rem_auto] items-end gap-2">
              <span className="pb-2.5 text-sm font-semibold text-gray-700 w-12">Dia {i + 1}</span>
              <div>
                {i === 0 && <span className="block text-[11px] text-gray-500 mb-0.5">Data</span>}
                <CampoData value={d.data} onChange={(iso) => set(i, { data: iso })} ariaLabel={`Data do dia ${i + 1}`} required />
              </div>
              <div>
                {i === 0 && <span className="block text-[11px] text-gray-500 mb-0.5">Entrada</span>}
                <input type="time" value={d.horaInicio} onChange={(e) => set(i, { horaInicio: e.target.value })} className={hora} aria-label={`Entrada do dia ${i + 1}`} />
              </div>
              <div>
                {i === 0 && <span className="block text-[11px] text-gray-500 mb-0.5">Saída</span>}
                <input type="time" value={d.horaFim} onChange={(e) => set(i, { horaFim: e.target.value })} className={hora} aria-label={`Saída do dia ${i + 1}`} />
              </div>
              <button type="button" disabled={dias.length <= 2} onClick={() => setDias((l) => l.filter((_, j) => j !== i))} aria-label={`Remover dia ${i + 1}`}
                className="p-2 mb-0.5 rounded-lg text-gray-500 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setDias((l) => { const u = l[l.length - 1]; return [...l, { data: somarDiasISO(u.data, 1), horaInicio: u.horaInicio, horaFim: u.horaFim }] })}
            className="inline-flex items-center gap-1 text-sm font-semibold text-action hover:underline"><Plus size={14} /> Adicionar dia</button>
        </div>
      )}
    </div>
  )
}
