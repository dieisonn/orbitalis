import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const METODOS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const RECURSOS: Record<string, string> = {
  'ordens-servico': 'O.S.', clientes: 'Cliente', ambientes: 'Ambiente', equipamentos: 'Equipamento',
  contratos: 'Contrato', 'planos-manutencao': 'Plano preventivo', orcamentos: 'Orçamento',
  agenda: 'Agenda', usuarios: 'Usuário/Técnico', equipe: 'Equipe', convites: 'Convite',
  configuracao: 'Configurações', 'modelos-checklist': 'Modelo de checklist', 'tipos-servico': 'Tipo de serviço',
  feriados: 'Feriado', perfil: 'Perfil', alertas: 'Alertas', financeiro: 'Financeiro', onboarding: 'Onboarding',
};

const SENSIVEL = /senha|password|token|hash|assinatura|base64|secret/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Remove segredos e corta textos longos antes de guardar o corpo da requisição
function limpar(v: unknown, nivel = 0): unknown {
  if (v == null) return v;
  if (typeof v === 'string') return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  if (typeof v !== 'object') return v;
  if (nivel > 3) return '…';
  if (Array.isArray(v)) return v.length > 30 ? [...v.slice(0, 30).map((x) => limpar(x, nivel + 1)), `… +${v.length - 30}`] : v.map((x) => limpar(x, nivel + 1));
  const o: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENSIVEL.test(k) ? '[oculto]' : limpar(val, nivel + 1);
  return o;
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Auditoria');
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string; email: string; role: string; empresaId?: string } | undefined;
    if (!user || !METODOS.has(req.method)) return next.handle();

    return next.handle().pipe(
      tap((resultado) => this.registrar(req, user, 200, resultado)),
      catchError((err) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        this.registrar(req, user, status, undefined, err instanceof Error ? err.message : undefined);
        return throwError(() => err);
      }),
    );
  }

  private registrar(
    req: { method: string; url: string; params?: Record<string, string>; body?: unknown },
    user: { id: string; email: string; role: string; empresaId?: string },
    status: number,
    resultado?: unknown,
    erro?: string,
  ) {
    // fora da requisição: não atrasa a resposta e nunca derruba a operação
    void (async () => {
      try {
        const caminho = req.url.split('?')[0].replace(/^\/?api\/v1\//, '').replace(/\/+$/, '');
        const partes = caminho.split('/').filter(Boolean);
        const recurso = partes[0] ?? '';
        const idNaRota = partes.find((p, i) => i > 0 && UUID.test(p));
        const idNoResultado = (resultado as { id?: string } | undefined)?.id;
        const resto = partes.slice(1).filter((p) => !UUID.test(p));
        const sub = resto.join(' › ');

        const verbo = req.method === 'POST' ? 'Criou' : req.method === 'DELETE' ? 'Excluiu' : 'Alterou';
        const rotulo = RECURSOS[recurso] ?? recurso;
        const acao = req.method === 'POST' ? 'criar' : req.method === 'DELETE' ? 'excluir' : 'editar';
        const nomeUsuario = await this.prisma.usuario.findUnique({ where: { id: user.id }, select: { nome: true } }).catch(() => null);

        const corpo = req.body && typeof req.body === 'object' && Object.keys(req.body as object).length ? limpar(req.body) : undefined;
        let detalhes = corpo as Record<string, unknown> | undefined;
        if (detalhes && JSON.stringify(detalhes).length > 4000) detalhes = { campos: Object.keys(detalhes) };
        if (erro) detalhes = { ...(detalhes ?? {}), erro };

        await this.prisma.logAuditoria.create({
          data: {
            empresaId: user.empresaId ?? null,
            usuarioId: user.id,
            usuarioNome: nomeUsuario?.nome ?? null,
            usuarioEmail: user.email,
            usuarioTipo: user.role,
            acao: status >= 400 ? 'falha' : acao,
            metodo: req.method,
            rota: `/${caminho}`.slice(0, 255),
            entidade: recurso.slice(0, 50) || null,
            entidadeId: (idNaRota ?? idNoResultado ?? null),
            descricao: (status >= 400 ? `Tentou: ${verbo.toLowerCase()} ` : `${verbo} `).concat(rotulo, sub ? ` · ${sub}` : '').slice(0, 255),
            detalhes: detalhes as object | undefined,
            status,
          },
        });
      } catch (e) {
        this.logger.error('Falha ao gravar o registro de atividade', e as Error);
      }
    })();
  }
}
