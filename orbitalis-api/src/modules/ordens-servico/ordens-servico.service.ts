import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OsStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdemServicoDto } from './dto/create-os.dto';
import { SincronizarOsDto } from './dto/sincronizar-os.dto';
import { TriarOsDto } from './dto/triar-os.dto';

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /ordens-servico (§6.1 + §6.2)
  // 1. Cria a O.S. pai para o ambiente
  // 2. Varre os equipamentos do ambiente e cria os itens filhos
  // 3. Faz deep copy do checklist ativo para cada item (snapshot)
  async create(dto: CreateOrdemServicoDto) {
    const ambiente = await this.prisma.ambiente.findUnique({
      where: { id: dto.ambienteId },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
    if (!ambiente) throw new NotFoundException('Ambiente não encontrado');

    const modeloChecklist = await this.prisma.modeloChecklist.findFirst();

    return this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          ambienteId: dto.ambienteId,
          tecnicoId: dto.tecnicoId,
          status: 'aberta',
          origem: dto.origem,
          dataAgendamento: new Date(dto.dataAgendamento),
          observacoesGerais: dto.observacoesGerais,
        },
      });

      // Deep copy do checklist para cada equipamento do ambiente (§6.2)
      const snapshot = modeloChecklist
        ? JSON.parse(JSON.stringify(modeloChecklist.itens))
        : [];

      await tx.ordemServicoItem.createMany({
        data: ambiente.equipamentos.map((eq) => ({
          ordemServicoId: os.id,
          equipamentoId: eq.id,
          statusItem: 'pendente',
          checklistSnapshot: snapshot,
        })),
      });

      return tx.ordemServico.findUnique({
        where: { id: os.id },
        include: { itens: true },
      });
    });
  }

  // GET /ordens-servico/painel — contadores por status para o dashboard (§US06)
  async painel() {
    const contagens = await this.prisma.ordemServico.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return contagens.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count._all }),
      {} as Record<string, number>,
    );
  }

  // GET /ordens-servico/tecnico/:tecnicoId — fila do técnico (§US08)
  findByTecnico(tecnicoId: string) {
    return this.prisma.ordemServico.findMany({
      where: {
        tecnicoId,
        status: { in: ['aberta', 'em_andamento'] },
      },
      include: { itens: { include: { equipamento: true } }, ambiente: true },
    });
  }

  // PATCH /ordens-servico/:id/sincronizar (§6.3 + §6.4)
  async sincronizar(id: string, dto: SincronizarOsDto) {
    return this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.findUnique({ where: { id } });
      if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');

      // Conflito de concorrência: Admin cancelou enquanto técnico trabalhava offline (§6.4)
      if (os.status === 'cancelada') {
        await tx.auditoriaConflitoSincronizacao.create({
          data: {
            ordemServicoId: id,
            payloadRejeitado: JSON.parse(JSON.stringify(dto)),
          },
        });
        throw new ConflictException(
          'Ordem de Serviço foi cancelada. Payload salvo em auditoria.',
        );
      }

      // Atualiza cada item do checklist com os dados coletados offline
      for (const item of dto.itens) {
        await tx.ordemServicoItem.update({
          where: { id: item.itemId },
          data: {
            statusItem: item.statusItem,
            observacoesTecnicas: item.observacoesTecnicas,
            checklistSnapshot: item.checklist as object,
          },
        });
      }

      const todosItens = await tx.ordemServicoItem.findMany({
        where: { ordemServicoId: id },
      });
      const todasConcluidas = todosItens.every((i) => i.statusItem === 'concluido');

      return tx.ordemServico.update({
        where: { id },
        data: {
          status: todasConcluidas ? 'concluida' : 'em_andamento',
          assinaturaUrl: dto.assinaturaUrl,
          observacoesGerais: dto.observacoesGerais,
          dataInicio: os.dataInicio ?? new Date(),
          dataConclusao: todasConcluidas ? new Date() : null,
        },
        include: { itens: true },
      });
    });
  }

  // POST /ordens-servico/evidencias/presigned-url (§API)
  // Emite URL pre-assinada S3 para upload direto pelo app móvel
  async presignedUrl(filename: string) {
    // TODO: integrar com AWS SDK S3 quando as credenciais estiverem configuradas
    // Retorna estrutura esperada pelo app mesmo sem credenciais em dev
    return {
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`,
      expiresIn: 300,
    };
  }

  // GET /ordens-servico/meus — histórico do cliente autenticado
  async findMeus(usuarioId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { usuarioId, deletedAt: null },
    });
    if (!cliente) return [];

    return this.prisma.ordemServico.findMany({
      where: {
        ambiente: { clienteId: cliente.id },
      },
      include: {
        ambiente: { select: { nome: true } },
        tecnico: { select: { email: true } },
        itens: { select: { id: true, statusItem: true } },
      },
      orderBy: { dataAgendamento: 'desc' },
    });
  }

  // GET /ordens-servico — listagem geral Admin com filtro opcional de status
  findAll(status?: OsStatus) {
    return this.prisma.ordemServico.findMany({
      where: status ? { status } : undefined,
      include: {
        ambiente: true,
        tecnico: { select: { id: true, email: true } },
        itens: { select: { id: true, statusItem: true } },
      },
      orderBy: { dataAgendamento: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        itens: { include: { equipamento: true } },
        ambiente: { include: { cliente: true } },
        tecnico: { select: { id: true, email: true } },
      },
    });
  }

  // PATCH /ordens-servico/:id/triar — Admin despacha a O.S. para o técnico (§US07)
  // Transição válida: aberta → agendada
  async triar(id: string, dto: TriarOsDto) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');

    if (os.status !== 'aberta') {
      throw new BadRequestException(
        `Triagem só é permitida em O.S. com status "aberta". Status atual: "${os.status}"`,
      );
    }

    const tecnico = await this.prisma.usuario.findFirst({
      where: { id: dto.tecnicoId, tipo: 'tecnico' },
    });
    if (!tecnico) throw new NotFoundException('Técnico não encontrado');

    return this.prisma.ordemServico.update({
      where: { id },
      data: {
        status: 'agendada',
        tecnicoId: dto.tecnicoId,
        dataAgendamento: new Date(dto.dataAgendamento),
      },
      include: {
        ambiente: true,
        tecnico: { select: { id: true, email: true } },
        itens: { select: { id: true, statusItem: true } },
      },
    });
  }

  // PATCH /ordens-servico/:id/cancelar — Admin cancela
  async cancelar(id: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');
    if (os.status === 'concluida') {
      throw new BadRequestException('Não é possível cancelar uma O.S. já concluída');
    }

    return this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'cancelada' },
    });
  }

  // PATCH /ordens-servico/:id/status — Admin altera status manualmente
  async alterarStatus(id: string, status: OsStatus) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');
    return this.prisma.ordemServico.update({ where: { id }, data: { status } });
  }

  // PATCH /ordens-servico/:id/financeiro — Admin registra valores da O.S.
  async atualizarFinanceiro(id: string, data: { valorMaoObra?: number; valorPecas?: number }) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');
    return this.prisma.ordemServico.update({ where: { id }, data });
  }

  // DELETE /ordens-servico/:id — exclusão definitiva com confirmação de senha
  async excluir(id: string, senha: string, adminId: string) {
    const admin = await this.prisma.usuario.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin não encontrado');
    const senhaOk = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Senha incorreta');

    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');

    // conflitos não têm cascade, precisam ser deletados antes
    await this.prisma.auditoriaConflitoSincronizacao.deleteMany({ where: { ordemServicoId: id } });
    // itens têm onDelete: Cascade, mas deleta explicitamente para segurança
    await this.prisma.ordemServicoItem.deleteMany({ where: { ordemServicoId: id } });
    await this.prisma.ordemServico.delete({ where: { id } });

    return { message: 'O.S. excluída permanentemente' };
  }

  // GET /ordens-servico/historico — últimos 12 meses agrupados por mês e status
  async historico() {
    const rows = await this.prisma.$queryRaw<
      { mes: string; status: string; total: bigint }[]
    >`
      SELECT
        TO_CHAR("data_criacao", 'YYYY-MM') AS mes,
        status::text,
        COUNT(*)::bigint AS total
      FROM ordens_servico
      WHERE "data_criacao" >= NOW() - INTERVAL '12 months'
      GROUP BY mes, status
      ORDER BY mes ASC
    `;

    // Pivot para { mes, aberta, agendada, em_andamento, concluida, cancelada }
    const byMes: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      if (!byMes[r.mes]) byMes[r.mes] = {};
      byMes[r.mes][r.status] = Number(r.total);
    }

    return Object.entries(byMes).map(([mes, counts]) => ({
      mes,
      aberta:       counts['aberta'] ?? 0,
      agendada:     counts['agendada'] ?? 0,
      em_andamento: counts['em_andamento'] ?? 0,
      concluida:    counts['concluida'] ?? 0,
      cancelada:    counts['cancelada'] ?? 0,
    }));
  }
}
