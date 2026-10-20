import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant.context';

// Models que recebem filtro automático por empresaId (nome do delegate: camelCase)
const TENANT_MODELS = new Set([
  'usuario', 'cliente', 'ambiente', 'equipamento', 'contrato',
  'orcamento', 'planoManutencao', 'ordemServico', 'tipoServico',
  'configuracaoEmpresa', 'alertaConfig', 'alertaOcorrencia', 'modeloChecklist',
  'convite',
]);

// Operações em lote que aceitam where livre
const FILTER_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany',
]);

// Operações por chave única: o Prisma aceita filtros extras no where (extendedWhereUnique)
const UNIQUE_OPS = new Set([
  'findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert',
]);

// Nas extensões o Prisma entrega `model` em PascalCase ("Cliente"); TENANT_MODELS usa o delegate.
const delegateName = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);

/**
 * Aplica o tenant (empresaId) aos argumentos de uma operação.
 * Única fonte da regra: usada pela extensão (queries normais) e pelo wrapper de transações.
 */
function scopeArgs(operation: string, args: any, empresaId: string) {
  args = args ?? {};

  if (FILTER_OPS.has(operation) || UNIQUE_OPS.has(operation)) {
    // empresaId por último: o chamador não consegue sobrescrever o tenant
    args.where = { ...(args.where ?? {}), empresaId };
  }

  if (operation === 'create') {
    args.data = { ...(args.data ?? {}), empresaId };
  } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
    args.data = Array.isArray(args.data)
      ? args.data.map((d: Record<string, unknown>) => ({ ...d, empresaId }))
      : { ...(args.data ?? {}), empresaId };
  } else if (operation === 'upsert') {
    args.create = { ...(args.create ?? {}), empresaId };
  }

  return args;
}

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
            if (empresaId && TENANT_MODELS.has(delegateName(model))) {
              args = scopeArgs(operation, args, empresaId);
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

    // Transações interativas: o `tx` nasce do cliente base (sem a extensão), então cada
    // delegate de tenant do `tx` é envolvido para aplicar o mesmo escopo.
    const baseTransaction = this.$transaction.bind(this) as (...a: any[]) => Promise<any>;
    Object.defineProperty(this, '$transaction', {
      value: (arg: unknown, ...rest: unknown[]) =>
        typeof arg === 'function'
          ? baseTransaction((tx: any) => (arg as (t: any) => unknown)(wrapTx(tx)), ...rest)
          : baseTransaction(arg, ...rest),
      configurable: true,
      enumerable: false,
    });
  }
}

function wrapTx(tx: any) {
  return new Proxy(tx, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || !TENANT_MODELS.has(prop) || !value) return value;

      return new Proxy(value, {
        get(delegate, op) {
          const fn = delegate[op];
          if (typeof fn !== 'function') return fn;
          return (args?: any) => {
            const empresaId = getTenantId();
            return fn.call(delegate, empresaId ? scopeArgs(String(op), args, empresaId) : args);
          };
        },
      });
    },
  });
}
