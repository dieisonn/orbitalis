import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateDiagnosticoDto } from './dto/create-diagnostico.dto'
import { parseLgmvCsv } from './lgmv-parser'
import { gerarRelatorio } from './lgmv-report'

@Injectable()
export class DiagnosticosLgmvService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDiagnosticoDto) {
    if (!dto.iduCsv && !dto.oduCsv) {
      throw new BadRequestException('Envie ao menos um arquivo (IDU ou ODU).')
    }

    const iduData = dto.iduCsv ? parseLgmvCsv(dto.iduCsv) : null
    const oduData = dto.oduCsv ? parseLgmvCsv(dto.oduCsv) : null

    if (dto.iduCsv && (!iduData || iduData.type !== 'IDU')) {
      throw new BadRequestException('Arquivo IDU inválido ou não reconhecido como formato LGMV.')
    }
    if (dto.oduCsv && (!oduData || oduData.type !== 'ODU')) {
      throw new BadRequestException('Arquivo ODU inválido ou não reconhecido como formato LGMV.')
    }

    const relatorio = gerarRelatorio(
      iduData?.type === 'IDU' ? iduData : null,
      oduData?.type === 'ODU' ? oduData : null,
    )

    return this.prisma.diagnosticoLgmv.create({
      data: {
        equipamentoId: dto.equipamentoId,
        osId: dto.osId ?? null,
        arquivoIduNome: dto.arquivoIduNome ?? null,
        arquivoOduNome: dto.arquivoOduNome ?? null,
        dataInspecao: dto.dataInspecao ? new Date(dto.dataInspecao) : null,
        dadosIdu: iduData ? (iduData as any) : undefined,
        dadosOdu: oduData ? (oduData as any) : undefined,
        relatorio: relatorio as any,
      },
      include: {
        equipamento: { select: { id: true, nome: true, marca: true, modelo: true } },
        os: { select: { id: true, numero: true } },
      },
    })
  }

  async findByEquipamento(equipamentoId: string) {
    return this.prisma.diagnosticoLgmv.findMany({
      where: { equipamentoId },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        criadoEm: true,
        dataInspecao: true,
        arquivoIduNome: true,
        arquivoOduNome: true,
        relatorio: true,
        os: { select: { id: true, numero: true } },
      },
    })
  }

  async update(id: string, data: { dataInspecao?: string | null }) {
    await this.findOne(id)
    return this.prisma.diagnosticoLgmv.update({
      where: { id },
      data: {
        dataInspecao: data.dataInspecao ? new Date(data.dataInspecao) : null,
      },
      select: { id: true, dataInspecao: true },
    })
  }

  async findByOs(osId: string) {
    return this.prisma.diagnosticoLgmv.findMany({
      where: { osId },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        criadoEm: true,
        arquivoIduNome: true,
        arquivoOduNome: true,
        relatorio: true,
        equipamento: { select: { id: true, nome: true } },
      },
    })
  }

  async findOne(id: string) {
    const diag = await this.prisma.diagnosticoLgmv.findUnique({
      where: { id },
      include: {
        equipamento: { select: { id: true, nome: true, marca: true, modelo: true } },
        os: { select: { id: true, numero: true } },
      },
    })
    if (!diag) throw new NotFoundException('Diagnóstico não encontrado.')
    return diag
  }

  async historicoMensal(ano: number) {
    const inicio = new Date(Date.UTC(ano, 0, 1))
    const fim = new Date(Date.UTC(ano + 1, 0, 1))

    const diags = await this.prisma.diagnosticoLgmv.findMany({
      where: {
        OR: [
          { dataInspecao: { gte: inicio, lt: fim } },
          { dataInspecao: null, criadoEm: { gte: inicio, lt: fim } },
        ],
      },
      select: { criadoEm: true, dataInspecao: true, relatorio: true },
    })

    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      normal: 0,
      atencao: 0,
      critico: 0,
    }))

    for (const d of diags) {
      const date = d.dataInspecao ?? d.criadoEm
      const month = date.getUTCMonth()
      const status = (d.relatorio as any)?.status ?? 'normal'
      if (month >= 0 && month < 12) {
        meses[month][status as 'normal' | 'atencao' | 'critico']++
      }
    }

    return meses
  }

  async recomputeAll() {
    const all = await this.prisma.diagnosticoLgmv.findMany({
      select: { id: true, dadosIdu: true, dadosOdu: true },
    })

    let updated = 0
    let skipped = 0
    const erros: string[] = []

    for (const diag of all) {
      const idu = diag.dadosIdu && (diag.dadosIdu as any).type === 'IDU'
        ? (diag.dadosIdu as any)
        : null
      const odu = diag.dadosOdu && (diag.dadosOdu as any).type === 'ODU'
        ? (diag.dadosOdu as any)
        : null

      if (!idu && !odu) { skipped++; continue }

      try {
        const relatorio = gerarRelatorio(idu, odu)
        await this.prisma.diagnosticoLgmv.update({
          where: { id: diag.id },
          data: { relatorio: relatorio as any },
        })
        updated++
      } catch (err) {
        erros.push(`${diag.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return { total: all.length, updated, skipped, erros }
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.diagnosticoLgmv.delete({ where: { id } })
    return { ok: true }
  }
}
