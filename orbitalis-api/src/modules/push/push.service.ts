import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantId } from '../../common/tenant.context';
import { endpointDePushValido } from './push-endpoint';

const MAX_APARELHOS_POR_USUARIO = 10;

export type AvisoPush = { titulo: string; corpo: string; url?: string; tag?: string };

/**
 * Avisos no celular (Web Push). As chaves VAPID são geradas uma única vez e ficam no banco,
 * então não depende de variável de ambiente.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private chaves: { publica: string; privada: string } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async carregarChaves() {
    if (this.chaves) return this.chaves;
    const db = this.prisma;
    let linha = await db.pushConfig.findUnique({ where: { id: 1 } });
    if (!linha) {
      const k = webpush.generateVAPIDKeys();
      try {
        linha = await db.pushConfig.create({ data: { id: 1, chavePublica: k.publicKey, chavePrivada: k.privateKey } });
      } catch {
        linha = await db.pushConfig.findUnique({ where: { id: 1 } }); // outra instância criou antes
      }
    }
    if (!linha) throw new Error('Chaves de aviso indisponíveis');
    this.chaves = { publica: linha.chavePublica, privada: linha.chavePrivada };
    webpush.setVapidDetails(process.env.PUSH_CONTATO ?? 'mailto:contato@orbitalis.com.br', this.chaves.publica, this.chaves.privada);
    return this.chaves;
  }

  async chavePublica() {
    return { chave: (await this.carregarChaves()).publica };
  }

  async assinar(usuarioId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    if (!endpointDePushValido(sub.endpoint)) throw new BadRequestException('Endereço de aviso inválido');
    const empresaId = getTenantId() ?? null;
    // Mesmo aparelho pode trocar de conta (ou de empresa): o endereço é único no banco inteiro,
    // então a troca é feita em uma única instrução, sem passar pelo filtro de empresa.
    await this.prisma.$executeRaw`
      INSERT INTO push_assinaturas (id, usuario_id, empresa_id, endpoint, p256dh, auth)
      VALUES (gen_random_uuid(), ${usuarioId}::uuid, ${empresaId}::uuid, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
      ON CONFLICT (endpoint) DO UPDATE
        SET usuario_id = EXCLUDED.usuario_id, empresa_id = EXCLUDED.empresa_id,
            p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, criado_em = now()`;
    // Limite de aparelhos por usuário: mantém os mais recentes
    const manter = await this.prisma.pushAssinatura.findMany({
      where: { usuarioId }, orderBy: { criadoEm: 'desc' }, take: MAX_APARELHOS_POR_USUARIO, select: { id: true },
    });
    await this.prisma.pushAssinatura.deleteMany({ where: { usuarioId, id: { notIn: manter.map((m) => m.id) } } });
    return { ok: true };
  }

  async desassinar(usuarioId: string, endpoint: string) {
    await this.prisma.pushAssinatura.deleteMany({ where: { usuarioId, endpoint } });
    return { ok: true };
  }

  /** Nunca lança: aviso é complemento, não pode derrubar a operação principal. */
  async notificar(usuarioIds: (string | null | undefined)[], aviso: AvisoPush) {
    try {
      const ids = [...new Set(usuarioIds.filter((x): x is string => !!x))];
      if (ids.length === 0) return;
      await this.carregarChaves();
      const subs = await this.prisma.pushAssinatura.findMany({ where: { usuarioId: { in: ids } } });
      const carga = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url ?? '/minhas-os', tag: aviso.tag });
      await Promise.all(subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 60 * 60 * 12 });
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) await this.prisma.pushAssinatura.deleteMany({ where: { endpoint: s.endpoint } }).catch(() => null);
          else this.log.warn(`Falha ao enviar aviso: ${e?.statusCode ?? e?.message}`);
        }
      }));
    } catch (e: any) {
      this.log.warn(`Aviso não enviado: ${e?.message}`);
    }
  }
}
