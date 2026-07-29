import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant.context';

// Models que recebem filtro automático por empresaId
const TENANT_MODELS = new Set([
  'usuario', 'cliente', 'ambiente', 'equipamento', 'contrato',
  'orcamento', 'planoManutencao', 'ordemServico', 'tipoServico',
  'configuracaoEmpresa', 'alertaConfig', 'alertaOcorrencia', 'modeloChecklist',
  'convite',
]);

// Operações de leitura/escrita em lote que aceitam where livre
const FILTER_OPS = new Set([
  'findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    this._installTenantFilter();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private _installTenantFilter() {
    const tenanted = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const empresaId = getTenantId();

            if (empresaId && TENANT_MODELS.has(model)) {
              if (FILTER_OPS.has(operation)) {
                args.where = { empresaId, ...(args.where ?? {}) };
              } else if (operation === 'create') {
                (args.data as Record<string, unknown>).empresaId = empresaId;
              } else if (operation === 'createMany') {
                const arr = Array.isArray(args.data) ? args.data : [args.data];
                arr.forEach(
                  (d: Record<string, unknown>) => (d.empresaId = empresaId),
                );
              } else if (operation === 'upsert') {
                // Injeta no ramo create do upsert
                (args.create as Record<string, unknown>).empresaId = empresaId;
              }
            }

            return query(args);
          },
        },
      },
    });

    // Substitui os delegates de model no próprio this para que todos os
    // services existentes continuem chamando this.prisma.usuario sem mudar nada
    for (const model of TENANT_MODELS) {
      Object.defineProperty(this, model, {
        get: () => (tenanted as any)[model],
        configurable: true,
        enumerable: true,
      });
    }
  }
}
