import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AgendaService } from '../agenda/agenda.service';
import { podeConceder, resolverAcesso } from '../../common/modulos';

type Quem = { id: string; permissoes?: string[] | null };

@Injectable()
export class EquipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: AgendaService,
  ) {}

  // O.S. ainda não concluídas: são as que precisam de responsável
  private static readonly OS_PENDENTES = ['aberta', 'agendada', 'em_andamento'] as const;

  /** O que o membro ainda tem sob sua responsabilidade (para decidir a transferência). */
  async carga(userId: string) {
    const membro = await this.prisma.usuario.findFirst({ where: { id: userId }, select: { id: true } });
    if (!membro) throw new NotFoundException('Membro não encontrado');
    const [os, planos, eventos] = await Promise.all([
      this.prisma.ordemServico.count({ where: { tecnicoId: userId, status: { in: [...EquipeService.OS_PENDENTES] } } }),
      this.prisma.planoManutencao.count({ where: { tecnicoId: userId, ativo: true } }),
      this.prisma.eventoAgenda.count({ where: { tecnicoId: userId, ordemServicoId: null, fim: { gte: new Date() } } }),
    ]);
    return { osPendentes: os, planosAtivos: planos, eventosAvulsos: eventos };
  }

  /**
   * Repassa para outro membro tudo o que o técnico ainda tem em aberto: O.S. não concluídas (e o evento
   * delas na agenda), planos preventivos ativos (as O.S. futuras já nascem para o novo responsável) e
   * eventos avulsos futuros da agenda. O que já foi concluído continua no nome de quem executou.
   */
  async transferir(userId: string, paraUserId: string) {
    if (!paraUserId) throw new BadRequestException('Escolha o técnico que vai receber');
    if (userId === paraUserId) throw new BadRequestException('Escolha um técnico diferente do atual');
    const [de, para] = await Promise.all([
      this.prisma.usuario.findFirst({ where: { id: userId }, select: { id: true } }),
      this.prisma.usuario.findFirst({ where: { id: paraUserId }, select: { id: true, tipo: true, nome: true } }),
    ]);
    if (!de) throw new NotFoundException('Membro não encontrado');
    if (!para || para.tipo === UsuarioTipo.cliente) throw new BadRequestException('O destino precisa ser um técnico ou usuário do escritório');

    const osIds = (await this.prisma.ordemServico.findMany({
      where: { tecnicoId: userId, status: { in: [...EquipeService.OS_PENDENTES] } },
      select: { id: true },
    })).map((o) => o.id);

    if (osIds.length) {
      await this.prisma.ordemServico.updateMany({ where: { id: { in: osIds } }, data: { tecnicoId: paraUserId } });
      for (const id of osIds) await this.agenda.sincronizarOs(id);
    }
    const planos = await this.prisma.planoManutencao.updateMany({
      where: { tecnicoId: userId, ativo: true },
      data: { tecnicoId: paraUserId },
    });
    const eventos = await this.prisma.eventoAgenda.updateMany({
      where: { tecnicoId: userId, ordemServicoId: null, fim: { gte: new Date() } },
      data: { tecnicoId: paraUserId },
    });
    return { osTransferidas: osIds.length, planosTransferidos: planos.count, eventosTransferidos: eventos.count, para: para.nome };
  }

  async getMembros() {
    const [membros, convitesPendentes] = await Promise.all([
      this.prisma.usuario.findMany({
        select: {
          id: true, email: true, nome: true, tipo: true,
          telefone: true, especialidade: true, dataCriacao: true,
          perfilAcesso: true, permissoes: true,
        },
        orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
      }),
      this.prisma.convite.findMany({
        where: { usadoEm: null, expiresAt: { gt: new Date() } },
        select: {
          id: true, tipo: true, email: true, clienteId: true,
          expiresAt: true, criadoEm: true, perfilAcesso: true, token: true,
        },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    // Enriquecer convites de cliente com razaoSocial
    const clienteIds = convitesPendentes
      .filter((c) => c.clienteId)
      .map((c) => c.clienteId as string);

    let clienteMap: Record<string, string> = {};
    if (clienteIds.length > 0) {
      const clientes = await this.prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, razaoSocial: true },
      });
      clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.razaoSocial]));
    }

    return {
      membros,
      convitesPendentes: convitesPendentes.map((c) => ({
        ...c,
        razaoSocialCliente: c.clienteId ? (clienteMap[c.clienteId] ?? null) : null,
      })),
    };
  }

  private acessoOuErro(perfil?: string, permissoes?: string[], quem?: Quem) {
    let acesso: { perfilAcesso: string; permissoes: string[] };
    try { acesso = resolverAcesso(perfil, permissoes); }
    catch (e) { throw new BadRequestException((e as Error).message); }
    if (!podeConceder(quem?.permissoes, acesso)) throw new ForbiddenException('Você não tem permissão para conceder esse acesso');
    return acesso;
  }

  // Quantos admins com acesso total existem (a empresa nunca pode ficar sem nenhum)
  private async totalAdminsCompletos(excetoId?: string) {
    return this.prisma.usuario.count({
      where: {
        tipo: UsuarioTipo.admin,
        OR: [{ perfilAcesso: null }, { perfilAcesso: 'administrador' }],
        ...(excetoId ? { NOT: { id: excetoId } } : {}),
      },
    });
  }

  // POST /equipe/usuarios — cria usuário do escritório já com senha provisória
  async criarUsuario(
    dto: { nome: string; email: string; senha: string; telefone?: string; perfilAcesso?: string; permissoes?: string[] },
    quem: Quem,
  ) {
    const nome = (dto.nome ?? '').trim();
    const email = (dto.email ?? '').trim().toLowerCase();
    if (!nome) throw new BadRequestException('Informe o nome');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('E-mail inválido');
    if (!dto.senha || dto.senha.length < 6) throw new BadRequestException('A senha precisa ter ao menos 6 caracteres');
    const acesso = this.acessoOuErro(dto.perfilAcesso, dto.permissoes, quem);

    if (nome.length > 150) throw new BadRequestException('O nome pode ter no máximo 150 caracteres');
    if ((dto.telefone ?? '').trim().length > 20) throw new BadRequestException('O telefone pode ter no máximo 20 caracteres');
    // o e-mail só não pode repetir dentro desta empresa (findFirst já filtra pela empresa)
    const emUso = await this.prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (emUso) throw new ConflictException('Este e-mail já tem cadastro nesta empresa');

    const criado = await this.prisma.usuario.create({
      data: {
        email, nome,
        telefone: dto.telefone?.trim() || null,
        senhaHash: await bcrypt.hash(dto.senha, 10),
        tipo: UsuarioTipo.admin,
        perfilAcesso: acesso.perfilAcesso,
        permissoes: acesso.permissoes,
      },
      select: { id: true, email: true, nome: true, perfilAcesso: true, permissoes: true },
    });
    return criado;
  }

  // PATCH /equipe/:userId/acesso — muda perfil e módulos de um usuário do escritório
  async atualizarAcesso(userId: string, dto: { perfilAcesso?: string; permissoes?: string[] }, quem: Quem) {
    const alvo = await this.prisma.usuario.findFirst({
      where: { id: userId, tipo: UsuarioTipo.admin },
      select: { id: true, perfilAcesso: true },
    });
    if (!alvo) throw new NotFoundException('Usuário não encontrado');
    // restrito só mexe em quem tem acesso restrito (não rebaixa/promove administrador completo)
    if (Array.isArray(quem.permissoes) && (!alvo.perfilAcesso || alvo.perfilAcesso === 'administrador')) {
      throw new ForbiddenException('Apenas um administrador pode alterar outro administrador');
    }
    const acesso = this.acessoOuErro(dto.perfilAcesso, dto.permissoes, quem);

    const eraCompleto = !alvo.perfilAcesso || alvo.perfilAcesso === 'administrador';
    if (eraCompleto && acesso.perfilAcesso !== 'administrador' && (await this.totalAdminsCompletos(userId)) === 0) {
      throw new BadRequestException('A empresa precisa de ao menos um administrador com acesso total');
    }
    return this.prisma.usuario.update({
      where: { id: userId },
      data: { perfilAcesso: acesso.perfilAcesso, permissoes: acesso.permissoes },
      select: { id: true, perfilAcesso: true, permissoes: true },
    });
  }

  async removerMembro(userId: string, quem: Quem, transferirPara?: string) {
    if (userId === quem.id) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    // findFirst aplica tenant filter automaticamente — garante que o membro pertence a este tenant
    const membro = await this.prisma.usuario.findFirst({
      where: { id: userId },
      select: { id: true, tipo: true, perfilAcesso: true },
    });
    if (!membro) throw new NotFoundException('Membro não encontrado');

    if (membro.tipo === UsuarioTipo.admin) {
      const completo = !membro.perfilAcesso || membro.perfilAcesso === 'administrador';
      if (completo && Array.isArray(quem.permissoes)) throw new ForbiddenException('Apenas um administrador pode remover outro administrador');
      if (completo && (await this.totalAdminsCompletos(userId)) === 0) {
        throw new BadRequestException('A empresa precisa de ao menos um administrador com acesso total');
      }
    }

    // Quem sai não pode deixar O.S. sem responsável: transfere junto (ou exige a escolha de quem recebe)
    const carga = await this.carga(userId);
    if (carga.osPendentes + carga.planosAtivos + carga.eventosAvulsos > 0) {
      if (!transferirPara) {
        throw new ConflictException(
          `Este membro ainda tem ${carga.osPendentes} O.S. pendente(s) e ${carga.planosAtivos} plano(s) preventivo(s) ativo(s). Transfira para outro técnico antes de remover.`,
        );
      }
      await this.transferir(userId, transferirPara);
    }

    // Remove o acesso mas mantém o registro (histórico de O.S., agenda e log). O e-mail e a senha são
    // invalidados para que o e-mail fique livre para um novo cadastro e a conta antiga não consiga mais entrar.
    await this.prisma.$transaction([
      this.prisma.cliente.updateMany({ where: { usuarioId: userId }, data: { usuarioId: null } }),
      this.prisma.usuario.update({
        where: { id: userId },
        data: { empresaId: null, email: `removido+${userId}@removido.invalid`, senhaHash: '!' },
      }),
    ]);
  }
}
