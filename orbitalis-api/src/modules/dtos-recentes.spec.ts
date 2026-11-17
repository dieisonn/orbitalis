import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssinarPushDto, DesassinarPushDto } from './push/push.dto';
import { AdicionarFotoDto, DefinirAuxiliaresDto } from './ordens-servico/dto/foto-auxiliares.dto';
import { SincronizarOsDto } from './ordens-servico/dto/sincronizar-os.dto';

const erros = async (cls: any, obj: unknown) => (await validate(plainToInstance(cls, obj) as object)).length;
const UUID = '8d1a7c1e-8a52-4d4f-9a8a-0d2f3e2a1b11';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('AssinarPushDto / DesassinarPushDto', () => {
  const ok = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a'.repeat(20), auth: 'b'.repeat(10) } };
  it('aceita assinatura completa', async () => expect(await erros(AssinarPushDto, ok)).toBe(0));
  it('recusa corpo vazio', async () => expect(await erros(AssinarPushDto, {})).toBeGreaterThan(0));
  it('recusa sem chaves', async () => expect(await erros(AssinarPushDto, { endpoint: ok.endpoint })).toBeGreaterThan(0));
  it('recusa chaves enormes', async () => expect(await erros(AssinarPushDto, { ...ok, keys: { p256dh: 'a'.repeat(500), auth: 'b' } })).toBeGreaterThan(0));
  it('desassinar exige endpoint', async () => {
    expect(await erros(DesassinarPushDto, {})).toBeGreaterThan(0);
    expect(await erros(DesassinarPushDto, { endpoint: 'https://x' })).toBe(0);
  });
});

describe('DefinirAuxiliaresDto', () => {
  it('aceita lista de UUIDs e lista vazia', async () => {
    expect(await erros(DefinirAuxiliaresDto, { tecnicoIds: [UUID] })).toBe(0);
    expect(await erros(DefinirAuxiliaresDto, { tecnicoIds: [] })).toBe(0);
  });
  it('recusa texto, ids inválidos, ausência e listas enormes', async () => {
    expect(await erros(DefinirAuxiliaresDto, { tecnicoIds: 'abc' })).toBeGreaterThan(0);
    expect(await erros(DefinirAuxiliaresDto, { tecnicoIds: ['x'] })).toBeGreaterThan(0);
    expect(await erros(DefinirAuxiliaresDto, {})).toBeGreaterThan(0);
    expect(await erros(DefinirAuxiliaresDto, { tecnicoIds: Array(21).fill(UUID) })).toBeGreaterThan(0);
  });
});

describe('AdicionarFotoDto', () => {
  it('aceita foto simples e com contexto', async () => {
    expect(await erros(AdicionarFotoDto, { dados: PNG })).toBe(0);
    expect(await erros(AdicionarFotoDto, { dados: PNG, itemId: UUID, momento: 'antes', legenda: 'ok' })).toBe(0);
  });
  it('recusa sem dados, dados numéricos, itemId inválido, momento inventado e legenda enorme', async () => {
    expect(await erros(AdicionarFotoDto, {})).toBeGreaterThan(0);
    expect(await erros(AdicionarFotoDto, { dados: 123 })).toBeGreaterThan(0);
    expect(await erros(AdicionarFotoDto, { dados: PNG, itemId: 'zzz' })).toBeGreaterThan(0);
    expect(await erros(AdicionarFotoDto, { dados: PNG, momento: 'qualquer' })).toBeGreaterThan(0);
    expect(await erros(AdicionarFotoDto, { dados: PNG, legenda: 'a'.repeat(201) })).toBeGreaterThan(0);
  });
});

describe('SincronizarOsDto', () => {
  const base = { itens: [{ itemId: UUID, statusItem: 'concluido' }] };
  it('aceita payload normal com assinatura PNG', async () => {
    expect(await erros(SincronizarOsDto, { ...base, assinaturaBase64: PNG, recebidoPor: 'Maria', entrada: '2026-11-17T08:00:00Z' })).toBe(0);
  });
  it('recusa assinatura que não é imagem', async () => {
    expect(await erros(SincronizarOsDto, { ...base, assinaturaBase64: '<script>alert(1)</script>' })).toBeGreaterThan(0);
    expect(await erros(SincronizarOsDto, { ...base, assinaturaBase64: 'data:image/svg+xml;base64,AAAA' })).toBeGreaterThan(0);
  });
  it('recusa textos acima do limite', async () => {
    expect(await erros(SincronizarOsDto, { ...base, recebidoPor: 'a'.repeat(121) })).toBeGreaterThan(0);
    expect(await erros(SincronizarOsDto, { ...base, observacoesGerais: 'a'.repeat(5001) })).toBeGreaterThan(0);
    expect(await erros(SincronizarOsDto, { itens: [{ ...base.itens[0], observacoesTecnicas: 'a'.repeat(5001) }] })).toBeGreaterThan(0);
  });
  it('recusa corpo vazio e item sem UUID', async () => {
    expect(await erros(SincronizarOsDto, {})).toBeGreaterThan(0);
    expect(await erros(SincronizarOsDto, { itens: [{ itemId: 'x', statusItem: 'concluido' }] })).toBeGreaterThan(0);
  });
});
