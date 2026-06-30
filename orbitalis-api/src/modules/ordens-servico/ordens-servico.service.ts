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
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { GoogleCalendarService, CalendarEventPayload } from '../google-calendar/google-calendar.service';

@Injectable()
export class OrdensServicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  private osNumeroFormatado(os: any): string {
    const sigla = os.tipoServico?.sigla ?? 'OS';
    const num = os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase();
    return `${sigla}-${num}`;
  }

  private buildCalendarPayload(os: any): CalendarEventPayload {
    return {
      osNumero:           this.osNumeroFormatado(os),
      ambienteNome:       os.ambiente?.nome ?? '',
      clienteNome:        os.ambiente?.cliente?.razaoSocial ?? '',
      clienteTelefone:    os.ambiente?.cliente?.telefone ?? null,
      tecnicoNome:        os.tecnico?.nome ?? null,
      tipo:               os.tipo ?? 'corretiva',
      dataAgendamento:    new Date(os.dataAgendamento),
      equipamentos:       (os.itens ?? []).map((i: any) => i.equipamento?.nome ?? '').filter(Boolean),
      observacoesGerais:  os.observacoesGerais ?? null,
      status:             os.status,
      tipoServicoSigla:   os.tipoServico?.sigla ?? null,
      tipoServicoColorId: os.tipoServico?.calendarColorId ?? null,
      horaInicio:         os.horaInicio ?? null,
      horaFim:            os.horaFim ?? null,
    };
  }

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

    const result = await this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          ambienteId:        dto.ambienteId,
          tecnicoId:         dto.tecnicoId,
          status:            'aberta',
          tipo:              dto.tipo ?? 'corretiva',
          origem:            dto.origem,
          dataAgendamento:   new Date(dto.dataAgendamento),
          observacoesGerais: dto.observacoesGerais,
          tipoServicoId:     dto.tipoServicoId ?? null,
          horaInicio:        dto.horaInicio ?? null,
          horaFim:           dto.horaFim ?? null,
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
        include: {
          itens:       { include: { equipamento: { select: { nome: true } } } },
          ambiente:    { include: { cliente: { select: { razaoSocial: true, telefone: true } } } },
          tecnico:     { select: { nome: true } },
          tipoServico: { select: { sigla: true, calendarColorId: true } },
        },
      });
    });

    // Cria evento no Google Calendar em background (sem bloquear resposta)
    if (result) {
      this.googleCalendar.criarEvento(this.buildCalendarPayload(result))
        .then((eventId) => {
          if (eventId) {
            return this.prisma.ordemServico.update({
              where: { id: result.id },
              data: { googleCalendarEventId: eventId },
            });
          }
        })
        .catch(() => null);
    }

    return result;
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
    const ha90Dias = new Date(agora);
    ha90Dias.setDate(ha90Dias.getDate() - 90);

    const [contagens, atrasadas, totalMes, concluidasMes, tecnicos, itensComTipo, planosRaw, custoMesRaw, osCorretivas, osConcluidas180, tempoMedioRaw, osSemTecnicoRaw] =
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

        // O.S. items com tipo do equipamento (todas as O.S., para contagem por tipo)
        this.prisma.ordemServicoItem.findMany({
          select: { equipamento: { select: { tipoEquipamento: true } } },
        }),

        // Planos vencendo em até 90 dias (inclui inativos para alertar renovação)
        this.prisma.planoManutencao.findMany({
          where: {
            dataFim: { gte: agora, lte: em90Dias },
          },
          select: {
            id: true,
            ativo: true,
            dataFim: true,
            cliente: { select: { nomeFantasia: true, razaoSocial: true } },
          },
          orderBy: { dataFim: 'asc' },
        }),

        // Custo total do mês (O.S. concluídas com dataAgendamento no mês)
        this.prisma.ordemServico.findMany({
          where: { dataAgendamento: { gte: inicioMes, lte: fimMes }, status: 'concluida' },
          select: { valorMaoObra: true, valorPecas: true },
        }),

        // Contagem de O.S. corretivas concluídas este mês
        this.prisma.ordemServico.count({
          where: { dataAgendamento: { gte: inicioMes, lte: fimMes }, tipo: 'corretiva' },
        }),

        // Total de O.S. concluídas nos últimos 180 dias (para taxa corretiva geral)
        this.prisma.ordemServico.count({
          where: { status: 'concluida', dataConclusao: { gte: ha30Dias } },
        }),

        // Tempo médio de atendimento (agendamento → conclusão) do mês
        this.prisma.ordemServico.findMany({
          where: {
            status: 'concluida',
            dataConclusao: { gte: inicioMes, lte: fimMes },
            dataInicio: { not: null },
          },
          select: { dataAgendamento: true, dataConclusao: true },
        }),

        // O.S. sem técnico atribuído (aberta/agendada)
        this.prisma.ordemServico.findMany({
          where: { status: { in: ['aberta', 'agendada'] }, tecnicoId: null },
          select: {
            id: true,
            numero: true,
            tipo: true,
            dataAgendamento: true,
            ambiente: {
              select: {
                nome: true,
                cliente: { select: { nomeFantasia: true, razaoSocial: true } },
              },
            },
          },
          orderBy: { dataAgendamento: 'asc' },
          take: 10,
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
        .map((p) => ({ id: p.id, dataFim: p.dataFim, ativo: p.ativo, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
      amarelo: planosRaw
        .filter((p) => p.dataFim! > em30Dias && p.dataFim! <= em60Dias)
        .map((p) => ({ id: p.id, dataFim: p.dataFim, ativo: p.ativo, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
      verde: planosRaw
        .filter((p) => p.dataFim! > em60Dias)
        .map((p) => ({ id: p.id, dataFim: p.dataFim, ativo: p.ativo, cliente: p.cliente.nomeFantasia ?? p.cliente.razaoSocial })),
    };

    const custoTotalMes = custoMesRaw.reduce((s, o) => {
      return s + Number(o.valorMaoObra ?? 0) + Number(o.valorPecas ?? 0);
    }, 0);

    const taxaCorretivas = totalMes > 0 ? Math.round((osCorretivas / totalMes) * 100) : 0;

    const tempoMedioAtendimento = tempoMedioRaw.length > 0
      ? Math.round(
          tempoMedioRaw.reduce((s, o) => {
            const dias = (o.dataConclusao!.getTime() - o.dataAgendamento.getTime()) / 86_400_000;
            return s + dias;
          }, 0) / tempoMedioRaw.length,
        )
      : null;

    // Top 5 equipamentos com mais corretivas nos últimos 90 dias
    const topEquipRaw = await this.prisma.ordemServicoItem.groupBy({
      by: ['equipamentoId'],
      where: {
        equipamento: { deletedAt: null },
        ordemServico: { tipo: 'corretiva', dataConclusao: { gte: ha90Dias } },
      },
      _count: { equipamentoId: true },
      orderBy: { _count: { equipamentoId: 'desc' } },
      take: 5,
    });

    const topEquipDetalhes = topEquipRaw.length > 0
      ? await this.prisma.equipamento.findMany({
          where: { id: { in: topEquipRaw.map((e) => e.equipamentoId!).filter(Boolean) } },
          select: {
            id: true,
            nome: true,
            tipoEquipamento: true,
            ambiente: {
              select: { nome: true, cliente: { select: { nomeFantasia: true, razaoSocial: true } } },
            },
          },
        })
      : [];

    const topEquipamentos = topEquipRaw
      .filter((e) => e.equipamentoId)
      .map((e) => {
        const det = topEquipDetalhes.find((d) => d.id === e.equipamentoId);
        return {
          id: e.equipamentoId as string,
          nome: det?.nome ?? '—',
          tipoEquipamento: det?.tipoEquipamento ?? '',
          cliente: det?.ambiente?.cliente?.nomeFantasia ?? det?.ambiente?.cliente?.razaoSocial ?? '',
          totalCorretivas: e._count.equipamentoId,
        };
      });

    const osSemTecnico = osSemTecnicoRaw.map((os) => ({
      id: os.id,
      numero: os.numero,
      tipo: os.tipo,
      dataAgendamento: os.dataAgendamento,
      cliente: os.ambiente?.cliente?.nomeFantasia ?? os.ambiente?.cliente?.razaoSocial ?? '—',
      ambiente: os.ambiente?.nome ?? '—',
    }));

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
      custoTotalMes,
      taxaCorretivas,
      tempoMedioAtendimento,
      totalConcluidasRecente: osConcluidas180,
      topEquipamentos,
      osSemTecnico,
    };
  }

  // GET /ordens-servico/tecnico/:tecnicoId — fila do técnico (§US08)
  findByTecnico(tecnicoId: string) {
    return this.prisma.ordemServico.findMany({
      where: {
        tecnicoId,
        status: { in: ['aberta', 'agendada', 'em_andamento'] },
      },
      include: { itens: { include: { equipamento: true } }, ambiente: true },
      orderBy: { dataAgendamento: 'asc' },
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
          assinaturaBase64: dto.assinaturaBase64,
          observacoesGerais: dto.observacoesGerais,
          dataInicio: os.dataInicio ?? new Date(),
          dataConclusao: todasConcluidas ? new Date() : null,
        },
        include: { itens: true },
      });
    });
  }

  // PATCH /ordens-servico/:id/concluir — Admin conclui com assinatura e dados de gás
  async concluir(
    id: string,
    data: { assinaturaBase64?: string; tipoGas?: string; quantidadeGasGramas?: number },
  ) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        status: 'concluida',
        dataConclusao: os.dataConclusao ?? new Date(),
        ...(data.assinaturaBase64 !== undefined ? { assinaturaBase64: data.assinaturaBase64 } : {}),
        ...(data.tipoGas !== undefined ? { tipoGas: data.tipoGas } : {}),
        ...(data.quantidadeGasGramas !== undefined ? { quantidadeGasGramas: data.quantidadeGasGramas } : {}),
      },
      include: {
        itens: true,
        ambiente: { include: { cliente: { select: { razaoSocial: true, telefone: true, usuario: { select: { email: true } } } } } },
        tecnico: { select: { email: true, nome: true } },
      },
    });

    const clienteEmail = updated.ambiente.cliente.usuario?.email;
    if (clienteEmail) {
      const osNumero = updated.numero != null ? `OS-${String(updated.numero).padStart(4, '0')}` : `OS-${id.slice(0, 6).toUpperCase()}`;
      this.notificacoes.notificarOsConcluida({
        clienteEmail,
        clienteNome: updated.ambiente.cliente.razaoSocial,
        clienteTelefone: updated.ambiente.cliente.telefone,
        osNumero,
        ambienteNome: updated.ambiente.nome,
        tecnicoNome: updated.tecnico?.nome ?? null,
        dataConclusao: updated.dataConclusao?.toISOString() ?? new Date().toISOString(),
      }).catch(() => null);
    }

    if (os.googleCalendarEventId) {
      this.googleCalendar.atualizarEvento(os.googleCalendarEventId, this.buildCalendarPayload({ ...updated, status: 'concluida' })).catch(() => null);
    }

    return updated;
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
    orderBy?: string;
  }) {
    const {
      status, tecnicoId, clienteId,
      dataInicio, dataFim, atrasadas,
      q, page = 1, perPage = 20, orderBy = 'numero_desc',
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
          tecnico:     { select: { id: true, email: true, nome: true } },
          itens:       { select: { id: true, statusItem: true } },
          tipoServico: { select: { sigla: true, nome: true, corHex: true } },
        },
        orderBy: this.resolveOrderBy(orderBy),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);

    return { data, total, page, perPage };
  }

  private resolveOrderBy(orderBy: string): object {
    switch (orderBy) {
      case 'numero_asc':  return { numero: 'asc' };
      case 'data_asc':    return { dataAgendamento: 'asc' };
      case 'data_desc':   return { dataAgendamento: 'desc' };
      default:            return { numero: 'desc' };
    }
  }

  findOne(id: string) {
    return this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        itens:       { include: { equipamento: true } },
        ambiente:    { include: { cliente: true } },
        tecnico:     { select: { id: true, email: true, nome: true } },
        tipoServico: true,
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

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        status: 'agendada',
        tecnicoId: dto.tecnicoId,
        dataAgendamento: new Date(dto.dataAgendamento),
      },
      include: {
        ambiente: { include: { cliente: true } },
        tecnico: { select: { id: true, email: true, nome: true } },
        itens: { select: { id: true, statusItem: true } },
      },
    });

    const osNumero = updated.numero != null ? `OS-${String(updated.numero).padStart(4, '0')}` : `OS-${id.slice(0, 6).toUpperCase()}`;
    this.notificacoes.notificarOsAgendada({
      tecnicoEmail: tecnico.email,
      tecnicoNome: tecnico.nome,
      osNumero,
      clienteNome: updated.ambiente.cliente.razaoSocial,
      ambienteNome: updated.ambiente.nome,
      dataAgendamento: dto.dataAgendamento,
    }).catch(() => null);

    return updated;
  }

  // PATCH /ordens-servico/:id/cancelar — Admin cancela
  async cancelar(id: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');
    if (os.status === 'concluida') {
      throw new BadRequestException('Não é possível cancelar uma O.S. já concluída');
    }

    if (os.googleCalendarEventId) {
      this.googleCalendar.excluirEvento(os.googleCalendarEventId).catch(() => null);
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

  // PATCH /ordens-servico/bulk-status — Altera status de múltiplas O.S. de uma vez
  async bulkAlterarStatus(ids: string[], status: OsStatus) {
    const { count } = await this.prisma.ordemServico.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { atualizadas: count };
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

    if (os.googleCalendarEventId) {
      this.googleCalendar.excluirEvento(os.googleCalendarEventId).catch(() => null);
    }

    // conflitos não têm cascade, precisam ser deletados antes
    await this.prisma.auditoriaConflitoSincronizacao.deleteMany({ where: { ordemServicoId: id } });
    // itens têm onDelete: Cascade, mas deleta explicitamente para segurança
    await this.prisma.ordemServicoItem.deleteMany({ where: { ordemServicoId: id } });
    await this.prisma.ordemServico.delete({ where: { id } });

    return { message: 'O.S. excluída permanentemente' };
  }

  // PATCH /ordens-servico/:id — Admin, edição geral de campos básicos
  async update(id: string, dto: {
    dataAgendamento?: string;
    observacoesGerais?: string | null;
    tecnicoId?: string | null;
    tipo?: string;
    tipoServicoId?: string | null;
    horaInicio?: string | null;
    horaFim?: string | null;
  }) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');
    if (os.status === 'concluida' || os.status === 'cancelada') {
      throw new BadRequestException('Não é possível editar uma O.S. encerrada');
    }
    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        ...(dto.dataAgendamento ? { dataAgendamento: new Date(dto.dataAgendamento) } : {}),
        ...(dto.observacoesGerais !== undefined ? { observacoesGerais: dto.observacoesGerais || null } : {}),
        ...(dto.tecnicoId !== undefined ? { tecnicoId: dto.tecnicoId || null } : {}),
        ...(dto.tipo ? { tipo: dto.tipo as any } : {}),
        ...(dto.tipoServicoId !== undefined ? { tipoServicoId: dto.tipoServicoId || null } : {}),
        ...(dto.horaInicio !== undefined ? { horaInicio: dto.horaInicio || null } : {}),
        ...(dto.horaFim !== undefined ? { horaFim: dto.horaFim || null } : {}),
      },
      include: {
        itens:       { include: { equipamento: { select: { nome: true } } } },
        ambiente:    { include: { cliente: { select: { razaoSocial: true, telefone: true } } } },
        tecnico:     { select: { nome: true } },
        tipoServico: { select: { sigla: true, calendarColorId: true } },
      },
    });

    if (os.googleCalendarEventId) {
      this.googleCalendar.atualizarEvento(os.googleCalendarEventId, this.buildCalendarPayload(updated)).catch(() => null);
    }

    return updated;
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
