import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OsOrigem, OsStatus, Prisma } from '@prisma/client';
import { getTenantId } from '../../common/tenant.context';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdemServicoDto } from './dto/create-os.dto';
import { SincronizarOsDto } from './dto/sincronizar-os.dto';
import { TriarOsDto } from './dto/triar-os.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { AgendaService } from '../agenda/agenda.service';
import { resolverChecklistItens } from '../../common/checklist-resolver';

const AMBIENTE_PADRAO = 'Sem local definido';

/** Dia de hoje no Brasil (UTC-3) como data à meia-noite UTC — mesma convenção de OrdemServico.dataAgendamento. */
function inicioHojeBR(): Date {
  const d = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class OrdensServicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly agenda: AgendaService,
  ) {}

  private osNumeroFormatado(os: any): string {
    const sigla = os.tipoServico?.sigla ?? 'OS';
    const num = os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase();
    return `${sigla}-${num}`;
  }

  // Ambiente padrão do cliente para O.S. abertas sem local específico (visita técnica, orçamento...).
  // Criado na primeira vez e reaproveitado depois; o usuário pode renomear/completar em Ambientes.
  private async ambientePadrao(clienteId: string): Promise<string> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
      select: { id: true, endereco: true },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    const existente = await this.prisma.ambiente.findFirst({
      where: { clienteId, nome: AMBIENTE_PADRAO, deletedAt: null },
      select: { id: true },
    });
    if (existente) return existente.id;
    const novo = await this.prisma.ambiente.create({
      data: {
        clienteId,
        nome: AMBIENTE_PADRAO,
        localizacaoInterna: cliente.endereco || AMBIENTE_PADRAO,
        metrosQuadrados: 0,
        capacidadeTermica: 'A definir',
      },
      select: { id: true },
    });
    return novo.id;
  }

  // POST /ordens-servico (§6.1 + §6.2)
  // 1. Cria a O.S. pai para o ambiente
  // 2. Varre os equipamentos do ambiente e cria os itens filhos
  // 3. Faz deep copy do checklist ativo para cada item (snapshot)
  async create(dto: CreateOrdemServicoDto, user?: { id: string; role: string }) {
    // Portal do cliente sempre escolhe um ambiente seu (evita criar ambiente em cliente alheio)
    if (user?.role === 'cliente' && !dto.ambienteId) throw new NotFoundException('Ambiente não encontrado');
    const ambienteId = dto.ambienteId ?? (await this.ambientePadrao(dto.clienteId!));
    const ambiente = await this.prisma.ambiente.findUnique({
      where: { id: ambienteId },
      include: { equipamentos: { where: { deletedAt: null } } },
    });
    if (!ambiente) throw new NotFoundException('Ambiente não encontrado');

    // Cliente só abre chamado nos próprios ambientes e não escolhe técnico nem origem
    if (user?.role === 'cliente') {
      const dono = await this.prisma.cliente.findFirst({
        where: { id: ambiente.clienteId, usuarioId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!dono) throw new NotFoundException('Ambiente não encontrado');
      dto = { ...dto, origem: OsOrigem.portal_cliente, tecnicoId: undefined };
    }

    // Com técnico definido já nasce agendada (não precisa passar pela triagem)
    const statusInicial: OsStatus = dto.tecnicoId ? 'agendada' : 'aberta';

    let equipamentosParaItens = ambiente.equipamentos;
    if (dto.equipamentoId) {
      const eq = ambiente.equipamentos.find((e) => e.id === dto.equipamentoId);
      if (!eq) throw new NotFoundException('Equipamento não encontrado neste ambiente');
      equipamentosParaItens = [eq];
    }

    // Checklist próprio do caso: escolhido pelo admin ou sugerido por tipo + tipo de serviço
    const snapshot = dto.semChecklist
      ? []
      : await resolverChecklistItens(this.prisma, {
          modeloChecklistId: dto.modeloChecklistId,
          tipo: dto.tipo ?? 'corretiva',
          tipoServicoId: dto.tipoServicoId,
        });

    const result = await this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          ambienteId:        ambiente.id,
          tecnicoId:         dto.tecnicoId,
          status:            statusInicial,
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
          tipoServico: { select: { sigla: true } },
        },
      });
    });

    // Avisa o técnico quando a O.S. já nasce agendada
    if (result && statusInicial === 'agendada' && dto.tecnicoId) {
      this.prisma.usuario
        .findFirst({ where: { id: dto.tecnicoId, tipo: 'tecnico' }, select: { email: true, nome: true } })
        .then((tec) => {
          if (!tec) return;
          const osNumero = result.numero != null
            ? `OS-${String(result.numero).padStart(4, '0')}`
            : `OS-${result.id.slice(0, 6).toUpperCase()}`;
          return this.notificacoes.notificarOsAgendada({
            tecnicoEmail: tec.email,
            tecnicoNome: tec.nome,
            osNumero,
            clienteNome: result.ambiente.cliente.razaoSocial,
            ambienteNome: result.ambiente.nome,
            dataAgendamento: dto.dataAgendamento,
          });
        })
        .catch(() => null);
    }

    // Evento na agenda do Orbitalis (título, endereço, descrição e duração vêm da O.S.)
    if (result) await this.agenda.sincronizarOs(result.id);

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
            dataAgendamento: { lt: inicioHojeBR() },
            status: { in: ['aberta', 'agendada', 'em_andamento'] },
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
          (o) => ['aberta', 'agendada', 'em_andamento'].includes(o.status) && o.dataAgendamento < inicioHojeBR(),
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
            // Concluir antes da data agendada não gera tempo negativo
            const dias = Math.max(0, (o.dataConclusao!.getTime() - o.dataAgendamento.getTime()) / 86_400_000);
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
  async sincronizar(id: string, dto: SincronizarOsDto, user?: { id: string; role: string }) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.findUnique({ where: { id } });
      if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');
      // Técnico só executa as O.S. atribuídas a ele
      if (user?.role === 'tecnico' && os.tecnicoId !== user.id) {
        throw new NotFoundException('Ordem de Serviço não encontrada');
      }
      if (os.status === 'concluida') {
        throw new BadRequestException('Esta O.S. já foi concluída');
      }

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

      // Só aceita itens que pertencem a esta O.S.
      const itensDaOs = await tx.ordemServicoItem.findMany({
        where: { ordemServicoId: id },
        select: { id: true },
      });
      const idsValidos = new Set(itensDaOs.map((i) => i.id));
      if (dto.itens.some((i) => !idsValidos.has(i.itemId))) {
        throw new BadRequestException('Há itens que não pertencem a esta Ordem de Serviço');
      }

      // Atualiza cada item do checklist com os dados coletados offline
      for (const item of dto.itens) {
        await tx.ordemServicoItem.update({
          where: { id: item.itemId },
          data: {
            statusItem: item.statusItem,
            observacoesTecnicas: item.observacoesTecnicas,
            ...(item.checklist ? { checklistSnapshot: item.checklist as unknown as Prisma.InputJsonValue } : {}),
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
    await this.agenda.sincronizarOs(id); // descrição do evento acompanha as observações
    return resultado;
  }

  // PATCH /ordens-servico/:id/concluir — Admin conclui com assinatura e dados de gás
  async concluir(
    id: string,
    data: { assinaturaBase64?: string; tipoGas?: string; quantidadeGasGramas?: number },
  ) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');
    if (os.status === 'cancelada') {
      throw new BadRequestException('Não é possível concluir uma O.S. cancelada');
    }
    const jaConcluida = os.status === 'concluida';

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
    if (clienteEmail && !jaConcluida) {
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
        tecnico: { select: { email: true, nome: true } },
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
      where.status = { in: ['aberta', 'agendada', 'em_andamento'] };
      where.dataAgendamento = { lt: inicioHojeBR() };
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

  async findOne(id: string, user?: { id: string; role: string }) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        itens:       { include: { equipamento: true } },
        ambiente:    { include: { cliente: true } },
        tecnico:     { select: { id: true, email: true, nome: true } },
        tipoServico: true,
      },
    });

    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');

    // Cliente só enxerga O.S. dos próprios ambientes. Responde "não encontrada"
    // (e não "proibido") para não revelar que o id existe.
    if (user?.role === 'tecnico' && os.tecnicoId !== user.id) {
      throw new NotFoundException('Ordem de Serviço não encontrada');
    }
    if (user?.role === 'cliente' && os.ambiente.cliente.usuarioId !== user.id) {
      throw new NotFoundException('Ordem de Serviço não encontrada');
    }

    return os;
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

    await this.agenda.sincronizarOs(id);

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

    return this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'cancelada' },
    });
  }

  // PATCH /ordens-servico/:id/status — Admin altera status manualmente
  async alterarStatus(id: string, status: OsStatus, user?: { id: string; role: string }) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada');

    // Admin muda o status livremente. O técnico só INICIA o atendimento das próprias O.S.;
    // encerrar passa por /sincronizar (checklist + assinatura) ou pelo admin.
    if (user?.role === 'tecnico') {
      if (os.tecnicoId !== user.id) throw new NotFoundException('Ordem de Serviço não encontrada');
      if (status !== 'em_andamento' || !['aberta', 'agendada', 'em_andamento'].includes(os.status)) {
        throw new BadRequestException('O técnico só pode iniciar o atendimento; para encerrar, registre a execução e a assinatura.');
      }
    }
    const agora = new Date();
    return this.prisma.ordemServico.update({
      where: { id },
      data: {
        status,
        // Mantém as datas coerentes com o status (cockpit, MTTR, financeiro e PMOC dependem delas)
        dataConclusao: status === 'concluida' ? (os.dataConclusao ?? agora) : null,
        ...(status === 'em_andamento' && !os.dataInicio ? { dataInicio: agora } : {}),
      },
    });
  }

  // PATCH /ordens-servico/bulk-status — Altera status de múltiplas O.S. de uma vez
  async bulkAlterarStatus(ids: string[], status: OsStatus) {
    const agora = new Date();
    const { count } = await this.prisma.ordemServico.updateMany({
      where: { id: { in: ids } },
      data: { status, ...(status !== 'concluida' ? { dataConclusao: null } : {}) },
    });
    // Mantém as datas coerentes com o status
    if (status === 'concluida') {
      await this.prisma.ordemServico.updateMany({
        where: { id: { in: ids }, dataConclusao: null },
        data: { dataConclusao: agora },
      });
    }
    if (status === 'em_andamento') {
      await this.prisma.ordemServico.updateMany({
        where: { id: { in: ids }, dataInicio: null },
        data: { dataInicio: agora },
      });
    }
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
    await this.confirmarSenha(adminId, senha);

    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');

    await this.apagarOs([id]);
    return { message: 'O.S. excluída permanentemente' };
  }

  // POST /ordens-servico/excluir-lote — exclusão definitiva de várias O.S., com a senha do admin
  async excluirLote(ids: string[], senha: string, adminId: string) {
    const lista = Array.from(new Set((ids ?? []).filter((i) => typeof i === 'string')));
    if (lista.length === 0) throw new BadRequestException('Selecione ao menos uma O.S.');
    if (lista.length > 200) throw new BadRequestException('Máximo de 200 O.S. por vez');
    await this.confirmarSenha(adminId, senha);

    // só considera O.S. do próprio tenant (o filtro automático cuida disso); ids inexistentes são ignorados
    const existentes = await this.prisma.ordemServico.findMany({ where: { id: { in: lista } }, select: { id: true } });
    const alvo = existentes.map((o) => o.id);
    await this.apagarOs(alvo);
    return { excluidas: alvo.length, ignoradas: lista.length - alvo.length };
  }

  private async confirmarSenha(adminId: string, senha: string) {
    if (!senha) throw new UnauthorizedException('Informe a sua senha para confirmar');
    const admin = await this.prisma.usuario.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin não encontrado');
    const senhaOk = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Senha incorreta');
  }

  private async apagarOs(ids: string[]) {
    if (ids.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
      // conflitos não têm cascade, precisam ser deletados antes
      await tx.auditoriaConflitoSincronizacao.deleteMany({ where: { ordemServicoId: { in: ids } } });
      // itens têm onDelete: Cascade, mas deleta explicitamente para segurança
      await tx.ordemServicoItem.deleteMany({ where: { ordemServicoId: { in: ids } } });
      await tx.ordemServico.deleteMany({ where: { id: { in: ids } } });
    });
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
    ambienteId?: string;
    clienteId?: string;
  }) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('O.S. não encontrada');

    // Troca de cliente/ambiente: os itens (equipamentos) acompanham o ambiente, então só dá para
    // trocar enquanto nada foi executado; depois disso a troca apagaria o trabalho do técnico.
    let novoAmbienteId: string | null = null;
    if (dto.ambienteId || dto.clienteId) {
      const alvo = dto.ambienteId ?? (await this.ambientePadrao(dto.clienteId!));
      if (alvo !== os.ambienteId) novoAmbienteId = alvo;
    }
    let novoAmbiente: { equipamentos: { id: string }[] } | null = null;
    let snapshotAtual: any = null;
    if (novoAmbienteId) {
      novoAmbiente = await this.prisma.ambiente.findFirst({
        where: { id: novoAmbienteId, deletedAt: null },
        include: { equipamentos: { where: { deletedAt: null }, select: { id: true } } },
      });
      if (!novoAmbiente) throw new NotFoundException('Ambiente não encontrado');
      const itensAtuais = await this.prisma.ordemServicoItem.findMany({ where: { ordemServicoId: id } });
      if (itensAtuais.some((i) => i.statusItem !== 'pendente' || i.observacoesTecnicas)) {
        throw new BadRequestException('Esta O.S. já tem itens executados ou com observações; não é possível trocar o ambiente. Crie uma nova O.S.');
      }
      snapshotAtual = itensAtuais[0]?.checklistSnapshot ?? null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (novoAmbienteId && novoAmbiente) {
        await tx.ordemServicoItem.deleteMany({ where: { ordemServicoId: id } });
        if (novoAmbiente.equipamentos.length > 0) {
          const snapshot = snapshotAtual ?? (await resolverChecklistItens(this.prisma, {
            tipo: (dto.tipo as any) ?? os.tipo,
            tipoServicoId: dto.tipoServicoId === undefined ? os.tipoServicoId ?? undefined : dto.tipoServicoId || undefined,
          }));
          await tx.ordemServicoItem.createMany({
            data: novoAmbiente.equipamentos.map((eq) => ({
              ordemServicoId: id, equipamentoId: eq.id, statusItem: 'pendente' as const, checklistSnapshot: snapshot,
            })),
          });
        }
      }
      return tx.ordemServico.update({
      where: { id },
      data: {
        ...(novoAmbienteId ? { ambienteId: novoAmbienteId } : {}),
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
        tipoServico: { select: { sigla: true } },
      },
      });
    });

    await this.agenda.sincronizarOs(id);

    return updated;
  }

  // GET /ordens-servico/historico?ano=XXXX
  // Sem parâmetro: Jan-Dez do ano corrente.
  // Com ano=XXXX: Jan-Dez daquele ano.
  async historico(ano?: number) {
    const anoAlvo = ano && ano > 2000 && ano < 2100 ? ano : new Date().getFullYear();
    const dataInicio = `${anoAlvo}-01-01`;
    const dataFim    = `${anoAlvo}-12-31`;
    // SQL cru não passa pelo filtro automático de tenant
    const empresaId  = getTenantId() ?? null;

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
        AND (${empresaId}::uuid IS NULL OR "empresa_id" = ${empresaId}::uuid)
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
