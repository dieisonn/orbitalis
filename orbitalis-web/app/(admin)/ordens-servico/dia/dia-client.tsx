'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { DocumentoOS, PRINT_CSS, type OS, type Config, type TipoServicoOpcao } from '../[id]/pdf/print-os'

export type ResumoOS = {
  id: string; numero: number | null; status: string; hora: string
  cliente: string; ambiente: string; tecnico: string | null; tipo: string | null; equipamentos: number
}

const STATUS: Record<string, string> = {
  aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
}

const rotulo = (n: number | null, id: string) => n != null ? `OS-${String(n).padStart(4, '0')}` : `OS-${id.slice(0, 6).toUpperCase()}`

export function DiaClient({ resumos, completas, config, tipos, diaLongo }: {
  resumos: ResumoOS[]; completas: OS[]; config: Config | null; tipos: TipoServicoOpcao[]; diaLongo: string
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(resumos.map((r) => r.id)))

  const alternar = (id: string) => setMarcadas((a) => {
    const n = new Set(a)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const todasMarcadas = resumos.length > 0 && marcadas.size === resumos.length
  const paraImprimir = completas.filter((o) => marcadas.has(o.id))
  const cor = config?.corPrimaria ?? '#0505ad'

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="print:hidden mt-5">
        {resumos.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-10 text-center text-gray-500 text-sm">
            Nenhuma O.S. agendada para <strong className="text-gray-700">{diaLongo}</strong>.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm text-gray-700">
                <strong className="first-letter:uppercase">{diaLongo}</strong> · {resumos.length} O.S. · {marcadas.size} selecionada(s)
              </p>
              <button
                type="button"
                disabled={paraImprimir.length === 0}
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                style={{ backgroundColor: cor }}
              >
                <Printer size={14} /> Imprimir {paraImprimir.length} O.S. / Salvar PDF
              </button>
            </div>

            <div className="bg-white border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs font-semibold text-gray-500">
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas"
                        checked={todasMarcadas}
                        onChange={() => setMarcadas(todasMarcadas ? new Set() : new Set(resumos.map((r) => r.id)))}
                      />
                    </th>
                    <th className="px-3 py-2.5">Hora</th>
                    <th className="px-3 py-2.5">O.S.</th>
                    <th className="px-3 py-2.5">Cliente / ambiente</th>
                    <th className="px-3 py-2.5 hidden md:table-cell">Técnico</th>
                    <th className="px-3 py-2.5 hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {resumos.map((r) => (
                    <tr key={r.id} className={marcadas.has(r.id) ? '' : 'opacity-50'}>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" aria-label={`Selecionar ${rotulo(r.numero, r.id)}`} checked={marcadas.has(r.id)} onChange={() => alternar(r.id)} />
                      </td>
                      <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{r.hora}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Link href={`/ordens-servico/${r.id}`} className="font-mono font-semibold text-primary hover:underline">{rotulo(r.numero, r.id)}</Link>
                        {r.tipo && <span className="ml-1.5 text-xs text-gray-500">{r.tipo}</span>}
                      </td>
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <p className="font-medium text-gray-900 line-clamp-2">{r.cliente}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{r.ambiente} · {r.equipamentos} equip.</p>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-gray-600">{r.tecnico ?? <span className="text-gray-400">Não atribuído</span>}</td>
                      <td className="px-3 py-2.5 hidden sm:table-cell text-gray-600 whitespace-nowrap">{STATUS[r.status] ?? r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Na janela de impressão, escolha “Salvar como PDF” ou a impressora. Cada O.S. começa em uma página nova.
            </p>
          </>
        )}
      </div>

      {/* Só aparece ao imprimir: uma O.S. por página */}
      <div className="hidden print:block">
        {paraImprimir.map((os, i) => (
          <div key={os.id} style={i > 0 ? { breakBefore: 'page' } : undefined}>
            <DocumentoOS os={os} config={config} tipos={tipos} modoDia />
          </div>
        ))}
      </div>
    </>
  )
}
