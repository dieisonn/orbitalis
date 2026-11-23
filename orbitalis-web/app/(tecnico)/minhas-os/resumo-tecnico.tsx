import { Gauge } from 'lucide-react'

export type ResumoTecnico = {
  emAberto: number; atrasadas: number; concluidasMes: number
  eficiencia: number | null; previstoMin: number; realizadoMin: number; avaliadas: number
}

const horas = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m}min`
}

/** Painel simples do técnico: o que está em aberto, atrasado, concluído no mês e a eficiência (previsto ÷ realizado). */
export function ResumoTecnicoCard({ r }: { r: ResumoTecnico }) {
  const ef = r.eficiencia
  const corEf = ef === null ? 'text-gray-400' : ef >= 100 ? 'text-green-600' : ef >= 80 ? 'text-amber-600' : 'text-red-600'
  const barra = ef === null ? 0 : Math.min(ef, 100)
  return (
    <section aria-label="Meu painel" className="bg-white border border-border rounded-2xl p-3.5 mb-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600 leading-none">{r.emAberto}</p>
          <p className="text-[11px] text-gray-500 mt-1">Em aberto</p>
        </div>
        <div>
          <p className={`text-2xl font-bold leading-none ${r.atrasadas > 0 ? 'text-red-600' : 'text-gray-300'}`}>{r.atrasadas}</p>
          <p className="text-[11px] text-gray-500 mt-1">Atrasadas</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600 leading-none">{r.concluidasMes}</p>
          <p className="text-[11px] text-gray-500 mt-1">Concluídas no mês</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><Gauge size={14} /> Eficiência no mês</p>
          <p className={`text-lg font-bold leading-none ${corEf}`}>{ef === null ? '—' : `${ef}%`}</p>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden" role="progressbar" aria-valuenow={ef ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${ef !== null && ef >= 100 ? 'bg-green-500' : ef !== null && ef >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${barra}%` }} />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          {ef === null
            ? 'Aparece quando você concluir O.S. com entrada e saída registradas.'
            : `Previsto ${horas(r.previstoMin)} · realizado ${horas(r.realizadoMin)} em ${r.avaliadas} O.S. (100% ou mais = dentro do tempo previsto)`}
        </p>
      </div>
    </section>
  )
}
