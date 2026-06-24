/**
 * Recomputes the stored `relatorio` for all DiagnosticoLgmv records using the
 * current threshold logic in lgmv-report.ts.
 *
 * Run from the orbitalis-api directory:
 *   npx ts-node -e "require('./scripts/recompute-lgmv-relatorios.ts')"
 * Or:
 *   npx ts-node scripts/recompute-lgmv-relatorios.ts
 */

import { PrismaClient } from '@prisma/client'
import { gerarRelatorio } from '../src/modules/diagnosticos-lgmv/lgmv-report'
import type { LgmvIduData, LgmvOduData } from '../src/modules/diagnosticos-lgmv/lgmv-parser'

const prisma = new PrismaClient()

async function main() {
  const all = await prisma.diagnosticoLgmv.findMany({
    select: { id: true, dadosIdu: true, dadosOdu: true, relatorio: true },
  })

  console.log(`Encontrados ${all.length} diagnósticos. Reprocessando...`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const diag of all) {
    try {
      const idu = diag.dadosIdu && (diag.dadosIdu as any).type === 'IDU'
        ? (diag.dadosIdu as unknown as LgmvIduData)
        : null

      const odu = diag.dadosOdu && (diag.dadosOdu as any).type === 'ODU'
        ? (diag.dadosOdu as unknown as LgmvOduData)
        : null

      if (!idu && !odu) {
        skipped++
        continue
      }

      const novoRelatorio = gerarRelatorio(idu, odu)

      await prisma.diagnosticoLgmv.update({
        where: { id: diag.id },
        data: { relatorio: novoRelatorio as any },
      })

      const statusAntes = (diag.relatorio as any)?.status ?? '?'
      const statusDepois = novoRelatorio.status
      const mudou = statusAntes !== statusDepois ? ` (${statusAntes} → ${statusDepois})` : ''
      console.log(`  ✓ ${diag.id}${mudou}`)
      updated++
    } catch (err) {
      console.error(`  ✗ ${diag.id}: ${err instanceof Error ? err.message : err}`)
      errors++
    }
  }

  console.log(`\nConcluído: ${updated} atualizados, ${skipped} ignorados (sem dados), ${errors} erros.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
