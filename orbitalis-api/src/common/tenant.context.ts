import { AsyncLocalStorage } from 'async_hooks';

const als = new AsyncLocalStorage<string>();

export function runWithTenant<T>(empresaId: string, fn: () => T): T {
  return als.run(empresaId, fn);
}

export function getTenantId(): string | undefined {
  return als.getStore();
}
