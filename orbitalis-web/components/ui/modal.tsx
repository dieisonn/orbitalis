'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

/** Janela de diálogo padrão: fecha com Esc ou clicando fora. */
export function Modal({ titulo, onFechar, children, largura = 'max-w-lg' }: { titulo: string; onFechar: () => void; children: React.ReactNode; largura?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`bg-white rounded-xl shadow-xl w-full ${largura} max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white'

export function Campo({ rotulo, children, dica, className = '' }: { rotulo: string; children: React.ReactNode; dica?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{rotulo}</span>
      {children}
      {dica && <span className="block text-xs text-gray-500 mt-1">{dica}</span>}
    </label>
  )
}
