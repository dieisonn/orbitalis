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
        // Monta a lista de datas a gerar:
        // - Com dataFim: todas as ocorrências de proximaGeracao até dataFim
        // - Sem dataFim: apenas a próxima ocorrência (lazy, gera 1 por cron)
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
          cursor.setDate(cursor.getDate() + plano.frequenciaDias);
        }

        const snapshot = plano.modeloChecklist
          ? JSON.parse(JSON.stringify(plano.modeloChecklist.itens))
          : [];

        for (const dataGeracao of datasParaGerar) {
          await this.prisma.$transaction(async (tx) => {
            const os = await tx.ordemServico.create({
              data: {
                ambienteId: plano.ambienteId,
                tecnicoId: plano.tecnicoId,
                status: 'agendada',
                origem: 'preventiva_automatica',
                dataAgendamento: dataGeracao,
              },
            });

            await tx.ordemServicoItem.createMany({
              data: plano.ambiente.equipamentos.map((eq) => ({
                ordemServicoId: os.id,
                equipamentoId: eq.id,
                statusItem: 'pendente' as const,
                checklistSnapshot: snapshot,
              })),
            });
          });

          geradas++;
        }

        // Avança proximaGeracao para depois da última O.S. gerada
        const ultimaData = datasParaGerar[datasParaGerar.length - 1];
        const proximaGeracao = new Date(ultimaData);
        proximaGeracao.setDate(proximaGeracao.getDate() + plano.frequenciaDias);

        // Desativa o plano se já passou de dataFim
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
          `${datasParaGerar.length} O.S. gerada(s) — ambiente: ${plano.ambiente.nome}${esgotado ? ' [PLANO CONCLUÍDO]' : ''}`,
        );
      } catch (err) {
        this.logger.error(`Falha ao gerar O.S. para plano ${plano.id}:`, err);
      }
    }

    this.logger.log(`Cron finalizado — ${geradas} O.S. gerada(s) no total`);
    return geradas;
  }
}
