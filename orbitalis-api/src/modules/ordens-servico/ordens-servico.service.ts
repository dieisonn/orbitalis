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

    let equipamentosParaItens = ambiente.equipamentos;
    if (dto.equipamentoId) {
      const eq = ambiente.equipamentos.find((e) => e.id === dto.equipamentoId);
      if (!eq) throw new NotFoundException('Equipamento não encontrado neste ambiente');
      equipamentosParaItens = [eq];
    }

    const modeloChecklist = await this.prisma.modeloChecklist.findFirst();
    const snapshot = modeloChecklist
      ? JSON.parse(JSON.stringify(modeloChecklist.itens))
      : [];

    return this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          ambienteId: dto.ambienteId,
          tecnicoId: dto.tecnicoId,
          status: 'aberta',
          tipo: dto.tipo ?? 'corretiva',
          origem: dto.origem,
          dataAgendamento: new Date(dto.dataAgendamento),
          observacoesGerais: dto.observacoesGerais,
        },
      });

      if (equipamentosParaItens.length > 0) {
        await tx.ordemServicoItem.createMany({
          data: equipamentosParaItens.map((eq) => ({
            ordemServicoId: os.id,
            equipamentoId: eq.id,
            statusItem: 'pendente',
            checklistSnapshot: snapshot,
          })),
        });
      }

      return tx.ordemServico.findUnique({
        where: { id: os.id },
        include: { itens: true },
      });
    });
  }

  // GET /ordens-servico/painel — dados do cockpit (contadores + atrasadas + taxa + ranking)
  async painel() {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes   = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    const ha30Dias = new Date(agora);
    ha30Dias.setDate(ha30Dias.getDate() - 30);
    const em30Dias = new Date(agora);
    em30Dias.setDate(em30Dias.getDate() + 30);
    const em60Dias = new Date(agora);
    em60Dias.setDate(em60Dias.getDate() + 60);
    const em90Dias = new Date(agora);
    em90Dias.setDate(em90Dias.getDate() + 90);

    const [contagens, atrasadas, totalMes, concluidasMes, tecnicos, itensComTipo, planosRaw] =
      await Promise.all([
        // Contagem por status (total geral)
        this.prisma.ordemServico.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),

        // O.S. com dataAgendamento no passado e ainda abertas/agendadas
        this.prisma.ordemServico.count({
          where: {
            dataAgendamento: { lt: agora },
            status: { in: ['aberta', 'agendada'] },
          },
        }),

        // Total de O.S. agendadas para o mês atual
        this.prisma.ordemServico.count({
          where: { dataAgendamento: { gte: inicioMes, lte: fimMes } },
        }),

        // O.S. concluídas com agendamento no mês atual
        this.prisma.ordemServico.count({
          where: {
            dataAgendamento: { gte: inicioMes, lte: fimMes },
            status: 'concluida',
          },
        }),

        // Técnicos: todas as O.S. para calcular carga detalhada
        this.prisma.usuario.findMany({
          where: { tipo: 'tecnico' },
          select: {
            id: true,
            nome: true,
            email: true,
            ordensComoTecnico: {
              select: {
                status: true,
                dataAgendamento: true,
                dataConclusao: true,
              },
            },
          },
        }),

        // O.S. items concluídas com tipo do equipamento (para contagem por tipo)
        this.prisma.ordemServicoItem.findMany({
          where: { ordemServico: { status: 'concluida' } },
          select: { equipamento: { select: { tipoEquipamento: true } } },
        }),

        // Planos vencendo em até 90 dias
        this.prisma.planoManutencao.findMany({
          where: {
            ativo: true,
            dataFim: { gte: agora, lte: em90Dias },
          },
          select: {
            id: true,
            dataFim: true,
            cliente: { select: { nomeFantasia: true, razaoSocial: true } },
          },
          orderBy: { dataFim: 'asc' },
        }),
      ]);

    const porStatus = contagens.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count._all }),
      {} as Record<string, number>,
    );

    const porTecnico = tecnicos
      .map((t) => {
        const ativas    = t.ordensComoTecnico.filter((o) =>
          ['aberta', 'agendada', 'em_andamento'].includes(o.status),
        );
        const concluídasUltimoMes = t.ordensComoTecnico.filter(
          (o) => o.status === 'concluida' && o.dataConclusao && o.dataConclusao >= ha30Dias,
        ).length;
        const atrasadasTec = ativas.filter(
          (o) => ['aberta', 'agendada'].includes(o.status) && o.dataAgendamento < agora,
        ).length;
        const aIniciar = ativas.filter(
          (o) => o.status === 'agendada' && o.dataAgendamento >= agora,
        ).length;

        return {
          tecnicoId: t.id,
          nome: t.nome ?? t.email,
          email: t.email,
          total: ativas.length,
          concluiuUltimoMes: concluídasUltimoMes,
          atrasadas: atrasadasTec,
          aIniciar,
        };
      })
      .filter((t) => t.total > 0 || t.concluiuUltimoMes > 0)
      .sort((a, b) => b.total - a.total);

    const porTipoEquipamento = itensComTipo.reduce(
      (acc, item) => {
        const tipo = item.equipamento?.tipoEquipamento ?? 'Outros';
        acc[tipo] = (acc[tipo] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const planosVencendo = {
      vermelho: planosRaw
        .filter((p) => p.dataFim! <= em30Dias)
        .map((p) => ({ id: p.id, dataFim: p.dataFim, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
      amarelo: planosRaw
        .filter((p) => p.dataFim! > em30Dias && p.dataFim! <= em60Dias)
        .map((p) => ({ id: p.id, dataFim: p.dataFim, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
      verde: planosRaw
        .filter((p) => p.dataFim! > em60Dias)
        .map((p) => ({ id: p.id, dataFim: p.dataFim, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
    };

    return {
      porStatus,
      atrasadas,
      taxaConclusao: {
        concluidas: concluidasMes,
        total: totalMes,
        percentual: totalMes > 0 ? Math.round((concluidasMes / totalMes) * 100) : 0,
      },
      porTecnico,
      porTipoEquipamento,
      planosVencendo,
    };
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

  // GET /ordens-servico — listagem admin com filtros, busca e paginação
  async findAll(filters: {
    status?: OsStatus;
    tecnicoId?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
    atrasadas?: boolean;
    q?: string;
    page?: number;
    perPage?: number;
  }) {
    const {
      status, tecnicoId, clienteId,
      dataInicio, dataFim, atrasadas,
      q, page = 1, perPage = 20,
    } = filters;

    const agora = new Date();
    const where: {
      status?: any; tecnicoId?: string; dataAgendamento?: any;
      ambiente?: any; OR?: any[];
    } = {};

    // Status / atrasadas (mutuamente exclusivos)
    if (atrasadas) {
      where.status = { in: ['aberta', 'agendada'] };
      where.dataAgendamento = { lt: agora };
    } else if (status) {
      where.status = status;
    }

    if (tecnicoId) where.tecnicoId = tecnicoId;
    if (clienteId) where.ambiente = { clienteId };

    // Date range (só se não for filtro "atrasadas")
    if (!atrasadas && (dataInicio || dataFim)) {
      where.dataAgendamento = {
        ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
        ...(dataFim ? { lte: new Date(`${dataFim}T23:59:59`) } : {}),
      };
    }

    // Busca textual: ambiente, cliente
    if (q) {
      where.OR = [
        { ambiente: { nome: { contains: q, mode: 'insensitive' } } },
        { ambiente: { cliente: { razaoSocial: { contains: q, mode: 'insensitive' } } } },
        { ambiente: { cliente: { nomeFantasia: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where,
        include: {
          ambiente: {
            select: {
              nome: true,
              cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
            },
          },
          tecnico: { select: { id: true, email: true, nome: true } },
          itens: { select: { id: true, statusItem: true } },
        },
        orderBy: { dataAgendamento: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);

    return { data, total, page, perPage };
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

  // GET /ordens-servico/historico?ano=XXXX
  // Sem parâmetro: Jan-Dez do ano corrente.
  // Com ano=XXXX: Jan-Dez daquele ano.
  async historico(ano?: number) {
    const anoAlvo = ano && ano > 2000 && ano < 2100 ? ano : new Date().getFullYear();
    const dataInicio = `${anoAlvo}-01-01`;
    const dataFim    = `${anoAlvo}-12-31`;

    const rows = await this.prisma.$queryRaw<
      { mes: string; status: string; total: bigint }[]
    >`
      SELECT
        TO_CHAR("data_agendamento", 'YYYY-MM') AS mes,
        status::text,
        COUNT(*)::bigint AS total
      FROM ordens_servico
      WHERE "data_agendamento" >= ${dataInicio}::date
        AND "data_agendamento" <= ${dataFim}::date
      GROUP BY mes, status
      ORDER BY mes ASC
    `;

    const byMes: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      if (!byMes[r.mes]) byMes[r.mes] = {};
      byMes[r.mes][r.status] = Number(r.total);
    }

    const result: {
      mes: string; aberta: number; agendada: number;
      em_andamento: number; concluida: number; cancelada: number;
    }[] = [];

    for (let m = 1; m <= 12; m++) {
      const mes = `${anoAlvo}-${String(m).padStart(2, '0')}`;
      const counts = byMes[mes] ?? {};
      result.push({
        mes,
        aberta:       counts['aberta']       ?? 0,
        agendada:     counts['agendada']     ?? 0,
        em_andamento: counts['em_andamento'] ?? 0,
        concluida:    counts['concluida']    ?? 0,
        cancelada:    counts['cancelada']    ?? 0,
      });
    }

    return result;
  }
}
