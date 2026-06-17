'use client'

import { useRouter } from 'next/navigation'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function MonthSelector({ mes, ano }: { mes: number; ano: number }) {
  const router = useRouter()

  function navigate(newMes: number, newAno: number) {
    router.push(`?mes=${newMes}&ano=${newAno}`)
  }

  function prev() {
    if (mes === 1) navigate(12, ano - 1)
    else navigate(mes - 1, ano)
  }

  function next() {
    if (mes === 12) navigate(1, ano + 1)
    else navigate(mes + 1, ano)
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors text-gray-600">
        ‹
      </button>
      <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">
        {MESES[mes - 1]} {ano}
      </span>
      <button onClick={next}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors text-gray-600">
        ›
      </button>
    </div>
  )
}
