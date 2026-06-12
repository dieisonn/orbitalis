'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function YearSelector({ ano }: { ano: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(newAno: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('ano', String(newAno))
    router.push(`${pathname}?${params.toString()}`)
  }

  const anoAtual = new Date().getFullYear()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(ano - 1)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Ano anterior"
      >
        <ChevronLeft size={15} />
      </button>

      <span className="text-sm font-bold text-gray-700 min-w-[44px] text-center">{ano}</span>

      <button
        onClick={() => navigate(ano + 1)}
        disabled={ano >= anoAtual + 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Próximo ano"
      >
        <ChevronRight size={15} />
      </button>

      {ano !== anoAtual && (
        <button
          onClick={() => navigate(anoAtual)}
          className="ml-1 text-xs text-primary font-semibold hover:underline"
        >
          Hoje
        </button>
      )}
    </div>
  )
}
