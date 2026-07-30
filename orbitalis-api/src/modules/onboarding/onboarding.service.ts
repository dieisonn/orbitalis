import { Injectable } from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const [usuario, totalClientes, totalTecnicos, totalEquipamentos, totalOs] =
      await Promise.all([
        this.prisma.usuario.findUnique({
          where: { id: userId },
          select: { nome: true },
        }),
        this.prisma.cliente.count(),
        this.prisma.usuario.count({ where: { tipo: UsuarioTipo.tecnico } }),
        this.prisma.equipamento.count(),
        this.prisma.ordemServico.count(),
      ]);

    return {
      etapas: {
        perfil:       !!usuario?.nome,
        cliente:      totalClientes > 0,
        tecnico:      totalTecnicos > 0,
        equipamento:  totalEquipamentos > 0,
        ordemServico: totalOs > 0,
      },
    };
  }
}
