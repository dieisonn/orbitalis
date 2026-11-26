import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { RESP_LABEL, type RespCancelamento } from '@/lib/cancelamento'

type Rel = {
  total: number
  porResponsavel: { empresa: number; cliente: number; outro: number; semMotivo: number }
  porMotivo: { codigo: string; label: string; resp: RespCancelamento | null; qtd: number }[]
  ordens: { id: string; numero: number | null; sigla: string; motivo: string | null; detalhe: string | null; cliente: string; tecnico: string | null }[]
}

/** Cancelamentos dos últimos 90 dias por responsável (empresa x cliente) e por motivo. */
export async function CardCancelamentos() {
  const r = await api.get<Rel>('/ordens-servico/cancelamentos').catch(() => null)
  if (!r) return null
  const resp = r.porResponsavel
  return (
    <div className="bg-white rounded-lg border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <XCircle size={14} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Cancelamentos (últimos 90 dias)</h2>
      </div>
      {r.total === 0 ? (
        <p className="text-sm text-gray-500 mt-3">Nenhuma O.S. cancelada no período.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{r.total} cancelada{r.total !== 1 ? 's' : ''}: onde a causa foi nossa e onde foi do cliente.</p>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            {(['empresa', 'cliente', 'outro'] as const).map((k) => (
              <div key={k} className={`rounded-lg border px-2 py-2 ${k === 'empresa' && resp.empresa > 0 ? 'border-red-200 bg-red-50' : 'border-border'}`}>
                <p className="text-xl font-bold tabular-nums text-gray-900">{resp[k]}</p>
                <p className="text-[11px] text-gray-600">{RESP_LABEL[k]}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-1.5">
            {r.porMotivo.slice(0, 6).map((m) => (
              <li key={m.codigo} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-700 truncate">{m.label}</span>
                <span className="tabular-nums font-semibold text-gray-900">{m.qtd}</span>
              </li>
            ))}
          </ul>
          {r.ordens.filter((o) => o.motivo === 'desistencia_atraso' || o.motivo === 'falha_equipe').slice(0, 4).length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Últimas por causa da empresa</p>
              <ul className="space-y-1">
                {r.ordens.filter((o) => o.motivo === 'desistencia_atraso' || o.motivo === 'falha_equipe').slice(0, 4).map((o) => (
                  <li key={o.id} className="text-xs text-gray-600">
                    <Link href={`/ordens-servico/${o.id}`} className="font-semibold text-primary hover:underline">{o.sigla}-{String(o.numero ?? 0).padStart(4, '0')}</Link>
                    {' '}· {o.cliente}{o.tecnico ? ` · ${o.tecnico}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
