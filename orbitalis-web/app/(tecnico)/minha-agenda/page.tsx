import { api } from '@/lib/api'
import { getUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Clock, MapPin, Navigation, Phone } from 'lucide-react'
import {
  type EventoAgenda, chaveDoInstante, diaPorExtenso, hoje, hhmm, instante, relogio, somarDias,
  mapaUrl, wazeUrl, STATUS_OS_LABEL,
} from '@/lib/agenda'

export default async function MinhaAgendaPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const h = hoje()
  const de = instante(h.y, h.m, h.d)
  const fimDia = somarDias(h, 15)
  const ate = instante(fimDia.y, fimDia.m, fimDia.d)

  let eventos: EventoAgenda[] = []
  try {
    eventos = await api.get<EventoAgenda[]>(`/agenda?inicio=${encodeURIComponent(de)}&fim=${encodeURIComponent(ate)}`)
  } catch { /* API indisponível */ }

  const grupos = new Map<string, EventoAgenda[]>()
  for (const e of eventos) {
    if (e.ordemServico?.status === 'cancelada') continue
    const k = chaveDoInstante(e.inicio)
    grupos.set(k, [...(grupos.get(k) ?? []), e])
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-primary">Minha agenda</h1>
        <p className="text-xs text-gray-500">Próximos 15 dias</p>
      </div>

      {grupos.size === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">Nenhum atendimento agendado.</p>
      )}

      {[...grupos.entries()].map(([k, lista]) => {
        const r = relogio(lista[0].inicio)
        return (
          <section key={k}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              {k === `${h.y}-${String(h.m + 1).padStart(2, '0')}-${String(h.d).padStart(2, '0')}` ? 'Hoje — ' : ''}{diaPorExtenso({ y: r.y, m: r.m, d: r.d })}
            </h2>
            <div className="space-y-2">
              {lista.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl border border-border shadow-sm p-4" style={{ borderLeft: `4px solid ${e.corHex}` }}>
                  <p className="font-semibold text-gray-900">{e.titulo}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {e.diaInteiro ? 'Dia inteiro' : `${hhmm(e.inicio)} – ${hhmm(e.fim)}`}
                    {e.ordemServico && <span className="ml-2 text-gray-400">· {STATUS_OS_LABEL[e.ordemServico.status] ?? e.ordemServico.status}</span>}
                  </p>
                  {e.local && (
                    <p className="text-sm text-gray-700 flex items-start gap-1.5 mt-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-primary" /> {e.local}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    {e.local && (
                      <>
                        <a href={mapaUrl(e.local)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action text-white font-semibold rounded-lg">
                          <Navigation size={12} /> Abrir no mapa
                        </a>
                        <a href={wazeUrl(e.local)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 font-semibold rounded-lg">
                          Waze
                        </a>
                      </>
                    )}
                    {e.cliente?.telefone && (
                      <a href={`tel:${e.cliente.telefone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 font-semibold rounded-lg">
                        <Phone size={12} /> Ligar
                      </a>
                    )}
                    {e.ordemServico && (
                      <a href={`/minhas-os/${e.ordemServico.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-700 font-semibold rounded-lg">
                        Abrir O.S.
                      </a>
                    )}
                  </div>
                  {e.descricao && (
                    <details className="mt-3 text-xs text-gray-600">
                      <summary className="cursor-pointer font-semibold text-gray-500">Descrição</summary>
                      <p className="whitespace-pre-wrap mt-2">{e.descricao}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
