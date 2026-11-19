'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Copy, Check, X } from 'lucide-react'
import { redefinirSenhaMembro } from './actions'

// Gera uma senha temporária para a pessoa; ela aparece uma única vez e deve ser trocada no primeiro acesso
export function RedefinirSenha({ userId, nome }: { userId: string; nome: string }) {
  const [pendente, iniciar] = useTransition()
  const [aberto, setAberto] = useState(false)
  const [resultado, setResultado] = useState<{ senhaTemporaria: string; email: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function redefinir() {
    setErro(null)
    iniciar(async () => {
      const r = await redefinirSenhaMembro(userId)
      if (!r.ok) setErro(r.error)
      else setResultado({ senhaTemporaria: r.senhaTemporaria, email: r.email })
    })
  }
  function fechar() { setAberto(false); setResultado(null); setErro(null); setCopiado(false) }
  async function copiar() {
    if (!resultado) return
    try { await navigator.clipboard.writeText(resultado.senhaTemporaria); setCopiado(true) } catch { /* copie à mão */ }
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
        <KeyRound size={12} /> Redefinir senha
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !pendente) fechar() }}>
          <div role="dialog" aria-modal="true" aria-labelledby={`rs-${userId}`} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 id={`rs-${userId}`} className="text-base font-bold text-gray-900">Redefinir senha de {nome}</h2>
              <button onClick={fechar} aria-label="Fechar" className="text-gray-500 hover:text-gray-800"><X size={16} /></button>
            </div>
            {!resultado ? (
              <>
                <p className="text-sm text-gray-700">
                  Vamos gerar uma <strong>senha temporária</strong>. A senha atual deixa de valer e, ao entrar, {nome} será obrigado(a) a criar uma nova.
                </p>
                {erro && <p role="alert" className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">{erro}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={fechar} disabled={pendente} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancelar</button>
                  <button onClick={redefinir} disabled={pendente} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-60">
                    {pendente ? 'Gerando…' : 'Gerar senha temporária'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">Passe esta senha para {nome} ({resultado.email}). Ela <strong>só aparece agora</strong>:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-center text-lg font-mono tracking-wider bg-gray-100 rounded-lg px-3 py-2 select-all">{resultado.senhaTemporaria}</code>
                  <button onClick={copiar} className="px-3 py-2 text-xs font-semibold border border-border rounded-lg hover:bg-surface inline-flex items-center gap-1">
                    {copiado ? <><Check size={14} /> Copiada</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={fechar} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Pronto</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
