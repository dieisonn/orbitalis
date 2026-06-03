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

  findAll() {
    return this.prisma.planoManutencao.findMany({
      include: { ambiente: true, tecnico: { select: { email: true } } },
      orderBy: { proximaGeracao: 'asc' },
    });
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

  // Disparo manual do cron — útil para testes e para o Admin forçar geração imediata
  dispararAgora() {
    return this.cronService.gerarOsPreventivas();
  }
}
