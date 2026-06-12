import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Executa diariamente às 00:00:01 (§US05)
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
        equipamentosConfig: {
          include: {
            equipamento: { select: { id: true, ambienteId: true } },
            modeloChecklist: true,
          },
        },
      },
    });

    this.logger.log(`${planos.length} plano(s) elegível(is) encontrado(s)`);

    let geradas = 0;

    for (const plano of planos) {
      try {
        // Agrupa equipamentos por ambienteId
        const ambienteMap = new Map<string, { equipamentoId: string; snapshot: unknown }[]>();
        for (const config of plano.equipamentosConfig) {
          const ambienteId = config.equipamento.ambienteId;
          if (!ambienteMap.has(ambienteId)) ambienteMap.set(ambienteId, []);
          ambienteMap.get(ambienteId)!.push({
            equipamentoId: config.equipamentoId,
            snapshot: config.modeloChecklist ? JSON.parse(JSON.stringify(config.modeloChecklist.itens)) : [],
          });
        }

        const datasParaGerar: Date[] = [];
        let cursor = new Date(plano.proximaGeracao);

        if (plano.dataFim) {
          while (cursor <= plano.dataFim) {
            datasParaGerar.push(new Date(cursor));
            cursor = new Date(cursor);
            cursor.setDate(cursor.getDate() + plano.frequenciaDias);
          }
        } else {
          datasParaGerar.push(new Date(cursor));
        }

        for (const dataGeracao of datasParaGerar) {
          for (const [ambienteId, equipamentos] of ambienteMap) {
            await this.prisma.$transaction(async (tx) => {
              const os = await tx.ordemServico.create({
                data: {
                  ambienteId,
                  planoId: plano.id,
                  tecnicoId: plano.tecnicoId,
                  status: 'agendada',
                  origem: 'preventiva_automatica',
                  dataAgendamento: dataGeracao,
                },
              });

              if (equipamentos.length > 0) {
                await tx.ordemServicoItem.createMany({
                  data: equipamentos.map((eq) => ({
                    ordemServicoId: os.id,
                    equipamentoId: eq.equipamentoId,
                    statusItem: 'pendente' as const,
                    checklistSnapshot: eq.snapshot,
                  })),
                });
              }
            });
            geradas++;
          }
        }

        const ultimaData = datasParaGerar[datasParaGerar.length - 1];
        const proximaGeracao = new Date(ultimaData);
        proximaGeracao.setDate(proximaGeracao.getDate() + plano.frequenciaDias);
        const esgotado = plano.dataFim ? proximaGeracao > plano.dataFim : false;

        await this.prisma.planoManutencao.update({
          where: { id: plano.id },
          data: {
            ultimaGeracao: ultimaData,
            proximaGeracao,
            ...(esgotado ? { ativo: false } : {}),
          },
        });

        this.logger.log(
          `Plano ${plano.id}: ${datasParaGerar.length} ciclo(s) × ${ambienteMap.size} ambiente(s)${esgotado ? ' [CONCLUÍDO]' : ''}`,
        );
      } catch (err) {
        this.logger.error(`Falha ao gerar O.S. para plano ${plano.id}:`, err);
      }
    }

    this.logger.log(`Cron finalizado — ${geradas} O.S. gerada(s) no total`);
    return geradas;
  }
}
