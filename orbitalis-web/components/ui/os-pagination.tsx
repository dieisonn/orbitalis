'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  total: number
  perPage: number
}

export function OsPagination({ page, total, perPage }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const totalPages = Math.ceil(total / perPage)

  if (totalPages <= 1) return null

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(p))
    router.push(`/ordens-servico?${next.toString()}`)
  }

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  // Páginas a mostrar: ao redor da atual
  const pages: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-xs text-gray-400">
        Mostrando <span className="font-medium text-gray-600">{start}–{end}</span> de{' '}
        <span className="font-medium text-gray-600">{total}</span> O.S.
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {pages[0] > 1 && (
          <>
            <button onClick={() => goTo(1)} className="px-2.5 py-1 text-xs rounded-lg hover:bg-surface">1</button>
            {pages[0] > 2 && <span className="px-1 text-gray-400 text-xs">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goTo(p)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              p === page
                ? 'bg-primary text-white'
                : 'hover:bg-surface text-gray-600'
            }`}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400 text-xs">…</span>}
            <button onClick={() => goTo(totalPages)} className="px-2.5 py-1 text-xs rounded-lg hover:bg-surface">{totalPages}</button>
          </>
        )}

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
