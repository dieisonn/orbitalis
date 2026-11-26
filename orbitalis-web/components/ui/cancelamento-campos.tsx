'use client'

import { MOTIVOS_CANCELAMENTO, RESP_LABEL, precisaDetalhe, type RespCancelamento } from '@/lib/cancelamento'

/** Motivo (obrigatório) e explicação do cancelamento. A explicação é exigida quando a causa é da empresa. */
export function CancelamentoCampos({
  motivo, detalhe, onMotivo, onDetalhe, compacto = true,
}: {
  motivo: string; detalhe: string
  onMotivo: (v: string) => void; onDetalhe: (v: string) => void
  compacto?: boolean
}) {
  const t = compacto ? 'text-xs' : 'text-sm'
  const campo = `w-full ${t} border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30`
  const grupos: RespCancelamento[] = ['empresa', 'cliente', 'outro']
  return (
    <div className="space-y-2 text-left">
      <label className={`block ${t} font-semibold text-gray-700`}>Motivo do cancelamento <span className="text-destructive">*</span></label>
      <select value={motivo} onChange={(e) => onMotivo(e.target.value)} className={campo} aria-label="Motivo do cancelamento">
        <option value="">Escolha o motivo…</option>
        {grupos.map((g) => (
          <optgroup key={g} label={RESP_LABEL[g]}>
            {MOTIVOS_CANCELAMENTO.filter((m) => m.resp === g).map((m) => <option key={m.codigo} value={m.codigo}>{m.label}</option>)}
          </optgroup>
        ))}
      </select>
      {motivo && (
        <>
          <textarea
            value={detalhe} onChange={(e) => onDetalhe(e.target.value)} rows={3} maxLength={2000}
            placeholder={precisaDetalhe(motivo) ? 'Explique o que aconteceu (obrigatório): horário combinado, atraso, o que o cliente disse…' : 'Detalhes (opcional)'}
            aria-label="Explicação do cancelamento" aria-required={precisaDetalhe(motivo)}
            className={`${campo} resize-none`}
          />
          {precisaDetalhe(motivo) && <p className="text-[11px] text-gray-500">Fica no histórico e no relatório de cancelamentos.</p>}
        </>
      )}
    </div>
  )
}
