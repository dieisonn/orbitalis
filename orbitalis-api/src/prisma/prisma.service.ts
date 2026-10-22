import { Injectable, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant.context';

// Models que recebem filtro automático por empresaId (nome do delegate: camelCase)
const TENANT_MODELS = new Set([
  'usuario', 'cliente', 'ambiente', 'equipamento', 'contrato',
  'orcamento', 'planoManutencao', 'ordemServico', 'tipoServico',
  'configuracaoEmpresa', 'alertaConfig', 'alertaOcorrencia', 'modeloChecklist',
  'convite', 'eventoAgenda', 'feriadoEmpresa',
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

// Chaves estrangeiras que precisam apontar para registros da MESMA empresa.
// O Prisma só confere se o id existe; sem isto, dava para criar um ambiente, equipamento,
// contrato ou plano dentro dos dados de outra empresa informando apenas o id.
const REFERENCIAS: Record<string, Record<string, string>> = {
  ambiente:               { clienteId: 'cliente' },
  equipamento:            { ambienteId: 'ambiente' },
  contrato:               { clienteId: 'cliente' },
  cliente:                { usuarioId: 'usuario' },
  convite:                { clienteId: 'cliente' },
  configuracaoEmpresa:    { responsavelTecnicoId: 'usuario' },
  modeloChecklist:        { tipoServicoId: 'tipoServico' },
  planoManutencao:        { clienteId: 'cliente', tecnicoId: 'usuario', tipoServicoId: 'tipoServico', contratoId: 'contrato' },
  eventoAgenda:           { ordemServicoId: 'ordemServico', tipoServicoId: 'tipoServico', tecnicoId: 'usuario', clienteId: 'cliente' },
  planoEquipamentoConfig: { planoId: 'planoManutencao', equipamentoId: 'equipamento', modeloChecklistId: 'modeloChecklist' },
  ordemServico:           { ambienteId: 'ambiente', tecnicoId: 'usuario', tipoServicoId: 'tipoServico', planoId: 'planoManutencao' },
  ordemServicoItem:       { ordemServicoId: 'ordemServico', equipamentoId: 'equipamento' },
  orcamento: {
    clienteId: 'cliente', ambienteId: 'ambiente', tipoServicoId: 'tipoServico',
    modeloChecklistId: 'modeloChecklist', ordemServicoId: 'ordemServico', criadoPorId: 'usuario',
  },
};

const WRITE_OPS = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert']);

// Modelos com numeração sequencial por empresa → nome do contador
const NUMERADOS: Record<string, string> = { ordemServico: 'ordem_servico', orcamento: 'orcamento' };

type ProximoNumero = (empresaId: string, nome: string) => Promise<number>;

/** Próximo número da empresa. Atômico: o UPDATE do contador serializa criações concorrentes. */
const sequenciaDe = (client: { $queryRaw: (q: Prisma.Sql) => Promise<unknown> }): ProximoNumero =>
  async (empresaId, nome) => {
    const rows = (await client.$queryRaw(Prisma.sql`
      INSERT INTO contadores_empresa (empresa_id, nome, valor)
      VALUES (${empresaId}::uuid, ${nome}, 1)
      ON CONFLICT (empresa_id, nome) DO UPDATE SET valor = contadores_empresa.valor + 1
      RETURNING valor`)) as { valor: number }[];
    return rows[0].valor;
  };

async function atribuirNumero(delegate: string, operation: string, args: any, proximo: ProximoNumero) {
  const nome = NUMERADOS[delegate];
  if (!nome || operation !== 'create' || !args?.data || args.data.numero !== undefined) return;
  const empresaId = args.data.empresaId ?? getTenantId();
  if (!empresaId) return; // sem empresa: fica o respaldo do banco
  args.data = { ...args.data, numero: await proximo(empresaId, nome) };
}

type Finder = (alvo: string, id: string) => Promise<unknown>;

async function verificarReferencias(delegate: string, operation: string, args: any, find: Finder) {
  const refs = REFERENCIAS[delegate];
  if (!refs || !WRITE_OPS.has(operation) || !args) return;

  const registros: any[] = [];
  for (const d of [args.data, args.create, args.update]) {
    if (Array.isArray(d)) registros.push(...d);
    else if (d && typeof d === 'object') registros.push(d);
  }

  const vistos = new Set<string>();
  for (const reg of registros) {
    for (const [campo, alvo] of Object.entries(refs)) {
      const id = reg[campo];
      if (typeof id !== 'string' || vistos.has(`${alvo}:${id}`)) continue;
      vistos.add(`${alvo}:${id}`);
      if (!(await find(alvo, id))) {
        throw new NotFoundException(`Registro referenciado não encontrado (${campo})`);
      }
    }
  }
}

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
    let tenantedRef: any;
    const proximoNumero = sequenciaDe(this as any);
    const tenanted = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const empresaId = getTenantId();
            const delegate = delegateName(model);
            if (empresaId && TENANT_MODELS.has(delegate)) {
              args = scopeArgs(operation, args, empresaId);
            }
            // Delegates fora de TENANT_MODELS (itens, configs) também têm referências a validar
            if (empresaId && REFERENCIAS[delegate]) {
              await verificarReferencias(delegate, operation, args, (alvo, id) =>
                tenantedRef[alvo].findFirst({ where: { id }, select: { id: true } }),
              );
            }
            await atribuirNumero(delegate, operation, args, proximoNumero);
            return query(args);
          },
        },
      },
    });

    tenantedRef = tenanted;

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
      if (typeof prop !== 'string' || !value || typeof value !== 'object') return value;
      const tenantModel = TENANT_MODELS.has(prop);
      if (!tenantModel && !REFERENCIAS[prop]) return value;

      return new Proxy(value, {
        get(delegate, op) {
          const fn = delegate[op];
          if (typeof fn !== 'function') return fn;
          return async (args?: any) => {
            const empresaId = getTenantId();
            if (!empresaId) {
              // Jobs (cron) sem contexto de tenant: a empresa vem explícita no data
              await atribuirNumero(prop, String(op), args, sequenciaDe(target));
              return fn.call(delegate, args);
            }
            if (tenantModel) args = scopeArgs(String(op), args, empresaId);
            await atribuirNumero(prop, String(op), args, sequenciaDe(target));
            await verificarReferencias(prop, String(op), args, (alvo, id) =>
              target[alvo].findFirst(scopeArgs('findFirst', { where: { id }, select: { id: true } }, empresaId)),
            );
            return fn.call(delegate, args);
          };
        },
      });
    },
  });
}
