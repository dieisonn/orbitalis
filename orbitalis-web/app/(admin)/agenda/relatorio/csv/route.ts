import { NextRequest, NextResponse } from 'next/server'
import { buscarRelatorio } from '../dados'

// Exporta o relatório de atendimentos em CSV (abre direto no Excel, com ; e acentos)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let r
  try {
    r = await buscarRelatorio({
      inicio: sp.get('inicio') ?? undefined, fim: sp.get('fim') ?? undefined,
      tecnicoId: sp.get('tecnicoId') ?? undefined, clienteId: sp.get('clienteId') ?? undefined,
    })
  } catch {
    return NextResponse.json({ message: 'Não foi possível gerar o relatório' }, { status: 400 })
  }
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const horas = (min: number) => (min / 60).toFixed(1).replace('.', ',')
  const linhas = [
    ['Tipo', 'Sigla', 'Atendimentos', '% do total', 'Concluídos', 'Agendados', 'Em andamento', 'Cancelados', 'Horas'],
    ...r.tipos.map((t) => [t.nome, t.sigla, t.total, String(t.percentual).replace('.', ','), t.concluidos, t.agendados, t.emAndamento, t.cancelados, horas(t.minutos)]),
    ['Total', '', r.total, '100', '', '', '', '', String(r.horas).replace('.', ',')],
  ]
  const csv = '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="atendimentos-${r.periodo.inicio}_a_${r.periodo.fim}.csv"`,
    },
  })
}
