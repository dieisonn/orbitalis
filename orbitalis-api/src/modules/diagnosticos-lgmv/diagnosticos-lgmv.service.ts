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
        arquivoIduNome: true,
        arquivoOduNome: true,
        relatorio: true,
        os: { select: { id: true, numero: true } },
      },
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

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.diagnosticoLgmv.delete({ where: { id } })
    return { ok: true }
  }
}
