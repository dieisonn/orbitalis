import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Executa diariamente às 00:00:01 (§US05)
  // Lê planos ativos cuja proxima_geracao <= agora e gera O.S. preventivas
  @Cron('1 0 0 * * *')
  async gerarOsPreventivas() {
    this.logger.log('Cron preventivo iniciado');

    const agora = new Date();

    const planos = await this.prisma.planoManutencao.findMany({
      where: {
        ativo: true,
        proximaGeracao: { lte: agora },
        OR: [{ dataFim: null }, { dataFim: { gte: agora } }],
      },
      include: {
        ambiente: {
          include: { equipamentos: { where: { deletedAt: null } } },
        },
        modeloChecklist: true,
      },
    });

    this.logger.log(`${planos.length} plano(s) elegível(is) encontrado(s)`);

    let geradas = 0;

    for (const plano of planos) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const os = await tx.ordemServico.create({
            data: {
              ambienteId: plano.ambienteId,
              tecnicoId: plano.tecnicoId,
              status: 'agendada',
              origem: 'preventiva_automatica',
              dataAgendamento: agora,
            },
          });

          // Deep copy do checklist no momento da geração (§6.2)
          const snapshot = plano.modeloChecklist
            ? JSON.parse(JSON.stringify(plano.modeloChecklist.itens))
            : [];

          await tx.ordemServicoItem.createMany({
            data: plano.ambiente.equipamentos.map((eq) => ({
              ordemServicoId: os.id,
              equipamentoId: eq.id,
              statusItem: 'pendente' as const,
              checklistSnapshot: snapshot,
            })),
          });

          // Avança a próxima geração pelo ciclo do plano
          const proximaGeracao = new Date(agora);
          proximaGeracao.setDate(proximaGeracao.getDate() + plano.frequenciaDias);

          await tx.planoManutencao.update({
            where: { id: plano.id },
            data: {
              ultimaGeracao: agora,
              proximaGeracao,
            },
          });
        });

        geradas++;
        this.logger.log(
          `O.S. preventiva gerada — ambiente: ${plano.ambiente.nome} (próxima em ${plano.frequenciaDias}d)`,
        );
      } catch (err) {
        this.logger.error(`Falha ao gerar O.S. para plano ${plano.id}:`, err);
      }
    }

    this.logger.log(`Cron finalizado — ${geradas}/${planos.length} O.S. gerada(s)`);
    return geradas;
  }
}
