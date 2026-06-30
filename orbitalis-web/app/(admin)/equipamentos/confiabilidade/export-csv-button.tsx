'use client'
import { Download } from 'lucide-react'

type MetricaEquip = {
  nome: string
  marca: string
  tipoEquipamento: string
  cliente: string | null
  ambiente: string | null
  totalCorretivas: number
  ultimaCorretiva: string | null
  mttrHoras: number | null
  mtbfDias: number | null
  taxaRetrabalho: number | null
  slaHoras: number | null
}

type Props = {
  metricas: MetricaEquip[]
  custoPorH: number | null
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR')
}

export function ExportCsvButton({ metricas, custoPorH }: Props) {
  function handleExport() {
    const cabecalho = [
      'Equipamento', 'Marca', 'Tipo', 'Cliente', 'Ambiente',
      'Corretivas (12m)', 'MTTR (h)', 'MTBF (d)',
      'Taxa Retrabalho (%)', 'SLA Atendimento (h)',
      ...(custoPorH !== null ? ['Custo Indisponibilidade (R$)'] : []),
      'Última Corretiva',
    ]

    const linhas = metricas.map((m) => {
      const custo = custoPorH !== null && m.mttrHoras !== null
        ? (custoPorH * m.mttrHoras * m.totalCorretivas).toFixed(2)
        : ''
      return [
        m.nome,
        m.marca,
        m.tipoEquipamento,
        m.cliente ?? '',
        m.ambiente ?? '',
        m.totalCorretivas,
        m.mttrHoras ?? '',
        m.mtbfDias ?? '',
        m.taxaRetrabalho ?? '',
        m.slaHoras ?? '',
        ...(custoPorH !== null ? [custo] : []),
        fmtDate(m.ultimaCorretiva),
      ].map(String)
    })

    const csv = [cabecalho, ...linhas]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `confiabilidade-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs font-semibold border border-border text-gray-600 px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
    >
      <Download size={13} />
      Exportar CSV
    </button>
  )
}
