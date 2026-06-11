import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
import { CreatePlanoManutencaoDto } from './dto/create-plano.dto';

@Injectable()
export class PlanosManutencaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
  ) {}

  create(dto: CreatePlanoManutencaoDto) {
    return this.prisma.planoManutencao.create({
      data: {
        ambienteId: dto.ambienteId,
        tecnicoId: dto.tecnicoId,
        modeloChecklistId: dto.modeloChecklistId,
        frequenciaDias: dto.frequenciaDias,
        proximaGeracao: new Date(dto.proximaGeracao),
        ativo: dto.ativo ?? true,
      },
      include: { ambiente: true, tecnico: { select: { email: true } } },
    });
  }

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.planoManutencao.findMany({
        include: { ambiente: true, tecnico: { select: { email: true } } },
        orderBy: { proximaGeracao: 'asc' },
        skip,
        take: perPage,
      }),
      this.prisma.planoManutencao.count(),
    ]);
    return { data, total, page, perPage };
  }

  async findOne(id: string) {
    const plano = await this.prisma.planoManutencao.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    return plano;
  }

  async toggleAtivo(id: string) {
    const plano = await this.findOne(id);
    return this.prisma.planoManutencao.update({
      where: { id },
      data: { ativo: !plano.ativo },
    });
  }

  async update(id: string, data: { tecnicoId?: string | null; frequenciaDias?: number; proximaGeracao?: string; ativo?: boolean }) {
    await this.findOne(id);
    const { proximaGeracao, ...rest } = data;
    return this.prisma.planoManutencao.update({
      where: { id },
      data: {
        ...rest,
        ...(proximaGeracao ? { proximaGeracao: new Date(proximaGeracao) } : {}),
      },
      include: { ambiente: true, tecnico: { select: { email: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.planoManutencao.delete({ where: { id } });
  }

  // Disparo manual do cron — útil para testes e para o Admin forçar geração imediata
  dispararAgora() {
    return this.cronService.gerarOsPreventivas();
  }
}
