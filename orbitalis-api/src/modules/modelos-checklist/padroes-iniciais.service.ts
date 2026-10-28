import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { runWithTenant } from '../../common/tenant.context';
import { TIPOS_SERVICO_PADRAO } from '../../common/tipos-servico-padrao';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelosChecklistService } from './modelos-checklist.service';

/**
 * Empresas criadas antes do isolamento por empresa (ou sem nenhum cadastro) não têm
 * checklists nem tipos de serviço próprios: a O.S. preventiva/corretiva sairia sem checklist.
 * No start, semeia os padrões SOMENTE onde não existe nenhum — nunca recria o que foi apagado
 * por quem já tem catálogo próprio.
 */
@Injectable()
export class PadroesIniciaisService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PadroesIniciaisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checklists: ModelosChecklistService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const empresas = await this.prisma.empresa.findMany({ select: { id: true, slug: true } });
      for (const emp of empresas) {
        await runWithTenant(emp.id, async () => {
          if ((await this.prisma.tipoServico.count()) === 0) {
            await this.prisma.tipoServico.createMany({
              data: TIPOS_SERVICO_PADRAO.map((t) => ({ ...t, sistema: true, empresaId: emp.id })),
              skipDuplicates: true,
            });
            this.logger.log(`Tipos de serviço padrão criados para ${emp.slug}`);
          }
          if ((await this.prisma.modeloChecklist.count()) === 0) {
            await this.checklists.seedPmocSplitHiwall();
            await this.checklists.seedAnvisa();
            await this.checklists.seedLimpezaQuimica();
            await this.checklists.seedCorretiva();
            await this.checklists.seedInstalacaoNova();
            await this.checklists.seedVisitaTecnica();
            this.logger.log(`Checklists padrão criados para ${emp.slug}`);
          }
        });
      }
    } catch (e) {
      // Não impede a API de subir
      this.logger.error('Falha ao semear padrões iniciais', e as Error);
    }
  }
}
