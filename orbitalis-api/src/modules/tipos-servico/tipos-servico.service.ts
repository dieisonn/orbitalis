import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Duração prevista em minutos: inteiro entre 5 min e 24 h. */
function validarDuracao(v?: number): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Number.isInteger(v) || v < 5 || v > 1440) {
    throw new BadRequestException('A duração deve ser um número inteiro de minutos entre 5 e 1440');
  }
  return v;
}

@Injectable()
export class TiposServicoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoServico.findMany({
      orderBy: [{ sistema: 'desc' }, { sigla: 'asc' }],
    });
  }

  async create(dto: {
    sigla: string;
    nome: string;
    corHex: string;
    duracaoMinutos?: number;
    valorPadrao?: number | null;
  }) {
    const sigla = dto.sigla.toUpperCase().trim();
    const existe = await this.prisma.tipoServico.findFirst({ where: { sigla } });
    if (existe) throw new BadRequestException(`Sigla "${sigla}" já cadastrada`);

    return this.prisma.tipoServico.create({
      data: {
        sigla,
        nome:            dto.nome.trim(),
        corHex:          dto.corHex,
        duracaoMinutos:  validarDuracao(dto.duracaoMinutos) ?? 60,
        valorPadrao:     dto.valorPadrao ?? null,
      },
    });
  }

  async update(
    id: string,
    dto: {
      nome?: string;
      corHex?: string;
      duracaoMinutos?: number;
      valorPadrao?: number | null;
      ativo?: boolean;
    },
  ) {
    const ts = await this.prisma.tipoServico.findUnique({ where: { id } });
    if (!ts) throw new NotFoundException('Tipo de serviço não encontrado');

    return this.prisma.tipoServico.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
        ...(dto.corHex !== undefined ? { corHex: dto.corHex } : {}),
        ...(dto.duracaoMinutos !== undefined ? { duracaoMinutos: validarDuracao(dto.duracaoMinutos) } : {}),
        ...(dto.valorPadrao !== undefined ? { valorPadrao: dto.valorPadrao } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
    });
  }

  async remove(id: string) {
    const ts = await this.prisma.tipoServico.findUnique({ where: { id } });
    if (!ts) throw new NotFoundException('Tipo de serviço não encontrado');
    if (ts.sistema) throw new BadRequestException('Tipos de serviço padrão não podem ser excluídos');
    return this.prisma.tipoServico.delete({ where: { id } });
  }
}
