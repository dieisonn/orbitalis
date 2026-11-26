'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { criarAjuste, removerAjuste, salvarSemanaEmpresa, salvarSemanaTecnico } from './actions'

export type Jornada = {
  empresa: number[]
  tecnicos: { id: string; nome: string; semana: number[] | null }[]
  ajustes: { id: string; tecnicoId: string; data: string; minutos: number; motivo: string | null }[]
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const campo = 'text-sm bg-surface border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30'
const aHoras = (min: number) => String(+(min / 60).toFixed(2)).replace('.', ',')
const aMin = (txt: string) => { const n = parseFloat(txt.replace(',', '.')); return Number.isFinite(n) ? Math.max(0, Math.min(24, n)) * 60 : 0 }

function SemanaInputs({ valor, onChange }: { valor: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DIAS.map((d, i) => (
        <label key={d} className="text-[11px] text-gray-500 text-center">
          {d}
          <input
            inputMode="decimal" value={valor[i]} aria-label={`Horas na ${d}`}
            onChange={(e) => onChange(valor.map((x, j) => (j === i ? e.target.value : x)))}
            className={`${campo} w-full text-center mt-0.5`}
          />
        </label>
      ))}
    </div>
  )
}

export function JornadaConfig({ jornada }: { jornada: Jornada }) {
  const router = useRouter()
  const [pendente, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [empresa, setEmpresa] = useState(jornada.empresa.map(aHoras))
  const [semanas, setSemanas] = useState<Record<string, string[] | null>>(
    Object.fromEntries(jornada.tecnicos.map((t) => [t.id, t.semana ? t.semana.map(aHoras) : null])),
  )
  const [aj, setAj] = useState({ tecnicoId: '', data: '', horas: '0', motivo: '' })

  const rodar = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setErro(null)
    start(async () => { const r = await fn(); if (!r.ok) setErro(r.error); else router.refresh() })
  }
  const nome = (id: string) => jornada.tecnicos.find((t) => t.id === id)?.nome ?? '—'

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-2">
        <h3 className="font-semibold text-gray-900">Jornada padrão da empresa</h3>
        <p className="text-xs text-gray-500">Horas de trabalho por dia da semana de cada técnico. Use 0 nos dias sem expediente.</p>
        <SemanaInputs valor={empresa} onChange={setEmpresa} />
        <button disabled={pendente} onClick={() => rodar(() => salvarSemanaEmpresa(empresa.map(aMin)))}
          className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50">Salvar jornada da empresa</button>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Jornada por técnico</h3>
        <p className="text-xs text-gray-500">Só preencha para quem tem jornada diferente (ex.: meio período). Os demais seguem a padrão.</p>
        {jornada.tecnicos.length === 0 && <p className="text-xs text-gray-500">Nenhum técnico cadastrado.</p>}
        {jornada.tecnicos.map((t) => {
          const s = semanas[t.id]
          return (
            <div key={t.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-800">{t.nome}</span>
                {s ? (
                  <span className="flex gap-2">
                    <button disabled={pendente} onClick={() => rodar(() => salvarSemanaTecnico(t.id, s.map(aMin)))} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg disabled:opacity-50">Salvar</button>
                    <button disabled={pendente} onClick={() => { setSemanas({ ...semanas, [t.id]: null }); rodar(() => salvarSemanaTecnico(t.id, null)) }} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-gray-600">Voltar ao padrão</button>
                  </span>
                ) : (
                  <button onClick={() => setSemanas({ ...semanas, [t.id]: empresa })} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-gray-700">Definir jornada própria</button>
                )}
              </div>
              {s ? <SemanaInputs valor={s} onChange={(v) => setSemanas({ ...semanas, [t.id]: v })} /> : <p className="text-xs text-gray-500">Segue a jornada padrão da empresa.</p>}
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Folgas e ajustes de um dia</h3>
        <p className="text-xs text-gray-500">Férias, folga ou meio período em uma data específica. Use 0 para folga.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-gray-500">Técnico
            <select value={aj.tecnicoId} onChange={(e) => setAj({ ...aj, tecnicoId: e.target.value })} className={`${campo} block mt-0.5`}>
              <option value="">Escolha…</option>
              {jornada.tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-gray-500">Data
            <input type="date" value={aj.data} onChange={(e) => setAj({ ...aj, data: e.target.value })} className={`${campo} block mt-0.5`} />
          </label>
          <label className="text-[11px] text-gray-500">Horas no dia
            <input inputMode="decimal" value={aj.horas} onChange={(e) => setAj({ ...aj, horas: e.target.value })} className={`${campo} block mt-0.5 w-20`} />
          </label>
          <label className="text-[11px] text-gray-500 flex-1 min-w-32">Motivo (opcional)
            <input value={aj.motivo} maxLength={120} onChange={(e) => setAj({ ...aj, motivo: e.target.value })} className={`${campo} block mt-0.5 w-full`} placeholder="Férias, consulta…" />
          </label>
          <button disabled={pendente || !aj.tecnicoId || !aj.data}
            onClick={() => rodar(async () => { const r = await criarAjuste(aj.tecnicoId, aj.data, Math.round(aMin(aj.horas)), aj.motivo); if (r.ok) setAj({ ...aj, data: '', motivo: '' }); return r })}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50">Adicionar</button>
        </div>
        {jornada.ajustes.length > 0 && (
          <ul className="divide-y divide-border border border-border rounded-lg">
            {jornada.ajustes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-gray-700">
                  <b>{nome(a.tecnicoId)}</b> · {a.data.split('-').reverse().join('/')} · {a.minutos === 0 ? 'folga' : `${aHoras(a.minutos)} h`}
                  {a.motivo ? <span className="text-gray-500"> · {a.motivo}</span> : null}
                </span>
                <button aria-label="Remover ajuste" disabled={pendente} onClick={() => rodar(() => removerAjuste(a.id))} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {erro && <p role="alert" className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
