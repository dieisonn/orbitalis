'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { excluirOs } from '../ordens-servico/excluir-os-action'

/**
 * Excluir um evento ligado a uma O.S. apaga os dois (definitivo), com a senha do admin.
 * Alternativa: só cancelar a O.S. (ela fica no histórico e o evento fica marcado como cancelado).
 */
export function ExcluirOsDialog({ osId, osNumero, status, onConcluido, onSoCancelar, onVoltar }: {
  osId: string; osNumero: string; status: string
  onConcluido: () => void
  onSoCancelar: () => Promise<void>
  onVoltar: () => void
}) {
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const podeCancelar = !['cancelada', 'concluida'].includes(status)

  async function excluir() {
    if (!senha) { setErro('Digite sua senha para confirmar'); return }
    setOcupado(true); setErro(null)
    const r = await excluirOs(osId, senha)
    if (!r.ok) { setErro(r.error ?? 'Erro ao excluir'); setOcupado(false); return }
    onConcluido()
  }
  async function cancelar() {
    setOcupado(true); setErro(null)
    try { await onSoCancelar() } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao cancelar'); setOcupado(false) }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onVoltar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="exc-os-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3">
        <h2 id="exc-os-titulo" className="text-base font-bold text-gray-900">Excluir O.S. {osNumero} e o evento</h2>
        <p className="text-sm text-gray-700">
          A O.S., os itens, as fotos e este evento da agenda serão apagados <strong>de forma permanente</strong>. Não dá para desfazer.
        </p>
        <div>
          <label htmlFor="exc-os-senha" className="block text-xs font-medium text-gray-600 mb-1">Sua senha</label>
          <input id="exc-os-senha" type="password" autoComplete="current-password" autoFocus value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void excluir() } }}
            className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-action/30 focus:border-action" />
        </div>
        {erro && <p role="alert" className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">{erro}</p>}
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={excluir} disabled={ocupado}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60">
            {ocupado && <Loader2 size={14} className="animate-spin" />} Excluir definitivamente
          </button>
          {podeCancelar && (
            <button onClick={cancelar} disabled={ocupado}
              className="w-full px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface disabled:opacity-60">
              Só cancelar a O.S. (mantém o histórico)
            </button>
          )}
          <button onClick={onVoltar} disabled={ocupado} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Voltar</button>
        </div>
      </div>
    </div>
  )
}
