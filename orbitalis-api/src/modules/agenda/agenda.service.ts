import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger,
  NotFoundException, OnApplicationBootstrap,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  DURACAO_PADRAO_MIN, janelaDaOs, paraHHMM, relogioLocal,
} from './agenda-tempo';
import { CreateEventoDto, UpdateEventoDto } from './dto/evento.dto';

const COR_PADRAO = '#039BE5';
const MAX_EVENTOS = 2000;

const INCLUDE_EVENTO = {
  ordemServico: { select: { id: true, numero: true, status: true, tipo: true } },
  tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true, duracaoMinutos: true } },
  tecnico: { select: { id: true, nome: true, email: true } },
  cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, telefone: true, endereco: true } },
} satisfies Prisma.EventoAgendaInclude;

type EventoCompleto = Prisma.EventoAgendaGetPayload<{ include: typeof INCLUDE_EVENTO }>;

const INCLUDE_OS = {
  ambiente: { include: { cliente: true } },
  tecnico: { select: { id: true, nome: true } },
  tipoServico: { select: { id: true, sigla: true, nome: true, duracaoMinutos: true } },
  itens: { include: { equipamento: { select: { nome: true } } } },
} satisfies Prisma.OrdemServicoInclude;

type OsCompleta = Prisma.OrdemServicoGetPayload<{ include: typeof INCLUDE_OS }>;

export function duracaoLegivel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

const nomeDoCliente = (c: { razaoSocial: string; nomeFantasia: string | null }) =>
  c.nomeFantasia?.trim() || c.razaoSocial;

const numeroDaOs = (os: { id: string; numero: number | null }, sigla?: string | null) =>
  `${sigla ?? 'OS'}-${os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase()}`;

@Injectable()
export class AgendaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgendaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // O.S. que já existiam antes da agenda própria entram nela (idempotente; roda no start)
  onApplicationBootstrap() {
    this.preencherAgendaInicial().catch((e) => this.logger.error('Falha ao preencher a agenda inicial', e));
  }

  async preencherAgendaInicial() {
    const desde = new Date(Date.now() - 90 * 86_400_000);
    const pendentes = await this.prisma.ordemServico.findMany({
      where: {
        evento: { is: null },
        status: { not: 'cancelada' },
        OR: [{ status: { in: ['aberta', 'agendada', 'em_andamento'] } }, { dataAgendamento: { gte: desde } }],
      },
      select: { id: true },
      take: 5000,
    });
    for (const { id } of pendentes) await this.sincronizarOs(id);
    if (pendentes.length) this.logger.log(`Agenda: ${pendentes.length} O.S. existentes incluídas`);
  }

  // ─── Sincronização O.S. → evento ────────────────────────────────────────────

  private tituloDaOs(os: OsCompleta) {
    const cliente = nomeDoCliente(os.ambiente.cliente);
    return `${os.tipoServico?.sigla ?? 'OS'} - ${cliente}`;
  }

  private descricaoDaOs(os: OsCompleta, duracaoMin: number) {
    const cli = os.ambiente.cliente;
    const tipoLabel = os.tipo === 'preventiva' ? 'Preventiva' : os.tipo === 'corretiva' ? 'Corretiva' : null;
    const base = process.env.FRONTEND_URL?.replace(/\/$/, '');
    return [
      `O.S. ${numeroDaOs(os, os.tipoServico?.sigla)}`,
      `Tipo: ${os.tipoServico?.nome ?? 'Ordem de Serviço'}${tipoLabel ? ` (${tipoLabel})` : ''}`,
      `Duração prevista: ${duracaoLegivel(duracaoMin)}`,
      '',
      `Cliente: ${nomeDoCliente(cli)}`,
      cli.telefone ? `Telefone: ${cli.telefone}` : null,
      `Endereço: ${cli.endereco}`,
      `Ambiente: ${os.ambiente.nome}${os.ambiente.localizacaoInterna ? ` — ${os.ambiente.localizacaoInterna}` : ''}`,
      os.tecnico?.nome ? `Técnico: ${os.tecnico.nome}` : null,
      os.itens.length ? '\nEquipamentos:' : null,
      ...os.itens.map((i) => `- ${i.equipamento?.nome ?? ''}`),
      os.observacoesGerais ? `\nDescrição / observações:\n${os.observacoesGerais}` : null,
      base ? `\nAbrir O.S.: ${base}/ordens-servico/${os.id}` : null,
    ].filter((l): l is string => l !== null).join('\n');
  }

  /** Cria ou atualiza o evento da O.S. Nunca lança: a agenda não pode derrubar a operação da O.S. */
  async sincronizarOs(osId: string): Promise<void> {
    try {
      await this.sincronizar(osId);
    } catch (e) {
      this.logger.error(`Falha ao sincronizar a agenda da O.S. ${osId}`, e as Error);
    }
  }

  private async sincronizar(osId: string) {
    const os = await this.prisma.ordemServico.findFirst({ where: { id: osId }, include: INCLUDE_OS });
    if (!os) return;

    const duracao = os.tipoServico?.duracaoMinutos ?? DURACAO_PADRAO_MIN;
    const { inicio, fim } = janelaDaOs(os.dataAgendamento, os.horaInicio, os.horaFim, duracao);
    const derivado = {
      inicio, fim,
      tecnicoId: os.tecnicoId,
      tipoServicoId: os.tipoServicoId,
      clienteId: os.ambiente.clienteId,
    };
    const textos = {
      titulo: this.tituloDaOs(os),
      descricao: this.descricaoDaOs(os, duracao),
      local: os.ambiente.cliente.endereco,
    };

    const existente = await this.prisma.eventoAgenda.findFirst({ where: { ordemServicoId: osId } });
    if (existente) {
      await this.prisma.eventoAgenda.update({
        where: { id: existente.id },
        data: { ...derivado, ...(existente.personalizado ? {} : textos) },
      });
      return;
    }
    try {
      await this.prisma.eventoAgenda.create({
        data: { ...derivado, ...textos, ordemServicoId: osId, empresaId: os.empresaId ?? undefined },
      });
    } catch (e) {
      // duas sincronizações simultâneas: a outra criou primeiro
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      await this.sincronizar(osId);
    }
  }

  // ─── Leitura ────────────────────────────────────────────────────────────────

  private paraResposta(e: EventoCompleto) {
    return {
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao,
      local: e.local,
      inicio: e.inicio.toISOString(),
      fim: e.fim.toISOString(),
      diaInteiro: e.diaInteiro,
      corHex: e.cor ?? e.tipoServico?.corHex ?? COR_PADRAO,
      personalizado: e.personalizado,
      tipoServico: e.tipoServico,
      tecnico: e.tecnico ? { id: e.tecnico.id, nome: e.tecnico.nome ?? e.tecnico.email } : null,
      cliente: e.cliente
        ? { id: e.cliente.id, nome: nomeDoCliente(e.cliente), telefone: e.cliente.telefone, endereco: e.cliente.endereco }
        : null,
      ordemServico: e.ordemServico
        ? {
            id: e.ordemServico.id,
            numero: numeroDaOs(e.ordemServico, e.tipoServico?.sigla),
            status: e.ordemServico.status,
          }
        : null,
    };
  }

  async avisos(usuarioId: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { avisosAgenda: true } });
    return { minutos: [...(u?.avisosAgenda ?? [30])].sort((a, b) => b - a) };
  }

  async salvarAvisos(usuarioId: string, minutos: number[]) {
    const ordenados = [...minutos].sort((a, b) => b - a);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { avisosAgenda: ordenados } });
    return { minutos: ordenados };
  }

  async listar(user: AuthUser, q: { inicio?: string; fim?: string; tecnicoId?: string; clienteId?: string }) {
    const de = q.inicio ? new Date(q.inicio) : new Date(Date.now() - 30 * 86_400_000);
    const ate = q.fim ? new Date(q.fim) : new Date(Date.now() + 60 * 86_400_000);
    if (isNaN(de.getTime()) || isNaN(ate.getTime())) throw new BadRequestException('Período inválido');
    if (ate <= de) throw new BadRequestException('O fim do período deve ser depois do início');
    if (ate.getTime() - de.getTime() > 120 * 86_400_000) throw new BadRequestException('Período máximo: 120 dias');

    const where: Prisma.EventoAgendaWhereInput = {
      inicio: { lt: ate },
      fim: { gt: de },
      ...(user.role === 'tecnico' ? { tecnicoId: user.id } : q.tecnicoId ? { tecnicoId: q.tecnicoId } : {}),
      ...(q.clienteId ? { clienteId: q.clienteId } : {}),
    };
    const eventos = await this.prisma.eventoAgenda.findMany({
      where, include: INCLUDE_EVENTO, orderBy: { inicio: 'asc' }, take: MAX_EVENTOS,
    });
    return eventos.map((e) => this.paraResposta(e));
  }

  /**
   * Relatório de atendimentos: quantos de cada tipo (visita, preventiva, PMOC, retrabalho...),
   * por técnico e por mês. Conta eventos que começam no período (datas AAAA-MM-DD, horário de São Paulo).
   */
  async relatorio(q: { inicio?: string; fim?: string; tecnicoId?: string; clienteId?: string }) {
    const dia = (v: string | undefined, padrao: Date) => {
      if (!v) return padrao;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      const [y, m, d] = v.split('-').map(Number);
      const data = new Date(Date.UTC(y, m - 1, d));
      if (data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) throw new BadRequestException('Data inválida');
      return data;
    };
    const hoje = relogioLocal(new Date()).dia;
    const primeiroDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    const de = dia(q.inicio, primeiroDoMes);
    const ate = dia(q.fim, hoje);
    if (ate < de) throw new BadRequestException('A data final deve ser depois da inicial');
    if ((ate.getTime() - de.getTime()) / 86_400_000 > 730) throw new BadRequestException('Período máximo: 2 anos');
    // meia-noite de São Paulo = 03:00 UTC; o dia final entra inteiro
    const desde = new Date(de.getTime() + 3 * 3_600_000);
    const ateExcl = new Date(ate.getTime() + 86_400_000 + 3 * 3_600_000);

    const eventos = await this.prisma.eventoAgenda.findMany({
      where: {
        inicio: { gte: desde, lt: ateExcl },
        ...(q.tecnicoId ? { tecnicoId: q.tecnicoId } : {}),
        ...(q.clienteId ? { clienteId: q.clienteId } : {}),
      },
      select: {
        inicio: true, fim: true, diaInteiro: true,
        tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true } },
        tecnico: { select: { id: true, nome: true, email: true } },
        ordemServico: { select: { status: true } },
      },
      orderBy: { inicio: 'asc' },
      take: 20_000,
    });

    type Linha = {
      chave: string; sigla: string; nome: string; corHex: string;
      total: number; concluidos: number; emAndamento: number; agendados: number; cancelados: number; minutos: number;
    };
    const porTipo = new Map<string, Linha>();
    const porTecnico = new Map<string, { id: string | null; nome: string; total: number; porTipo: Record<string, number> }>();
    const porMes = new Map<string, { mes: string; total: number; porTipo: Record<string, number> }>();
    let minutosTotal = 0;

    for (const e of eventos) {
      const t = e.tipoServico;
      const chave = t?.id ?? 'sem-tipo';
      const sigla = t?.sigla ?? '—';
      const linha = porTipo.get(chave) ?? {
        chave, sigla, nome: t?.nome ?? 'Sem tipo', corHex: t?.corHex ?? '#9ca3af',
        total: 0, concluidos: 0, emAndamento: 0, agendados: 0, cancelados: 0, minutos: 0,
      };
      const min = e.diaInteiro ? 0 : Math.max(0, Math.round((e.fim.getTime() - e.inicio.getTime()) / 60_000));
      linha.total++;
      linha.minutos += min;
      minutosTotal += min;
      const st = e.ordemServico?.status;
      if (st === 'concluida') linha.concluidos++;
      else if (st === 'em_andamento') linha.emAndamento++;
      else if (st === 'cancelada') linha.cancelados++;
      else linha.agendados++;
      porTipo.set(chave, linha);

      const tecId = e.tecnico?.id ?? 'sem-tecnico';
      const tec = porTecnico.get(tecId) ?? {
        id: e.tecnico?.id ?? null, nome: e.tecnico ? (e.tecnico.nome ?? e.tecnico.email) : 'Sem técnico', total: 0, porTipo: {},
      };
      tec.total++;
      tec.porTipo[chave] = (tec.porTipo[chave] ?? 0) + 1;
      porTecnico.set(tecId, tec);

      const l = relogioLocal(e.inicio).dia;
      const mes = `${l.getUTCFullYear()}-${String(l.getUTCMonth() + 1).padStart(2, '0')}`;
      const m = porMes.get(mes) ?? { mes, total: 0, porTipo: {} };
      m.total++;
      m.porTipo[chave] = (m.porTipo[chave] ?? 0) + 1;
      porMes.set(mes, m);
    }

    const total = eventos.length;
    const tipos = [...porTipo.values()]
      .sort((a, b) => b.total - a.total)
      .map((l) => ({ ...l, percentual: total ? +((l.total / total) * 100).toFixed(1) : 0 }));
    const cont = (...siglas: string[]) => tipos.filter((t) => siglas.includes(t.sigla)).reduce((s, t) => s + t.total, 0);
    const retrabalho = cont('RT');

    return {
      periodo: { inicio: de.toISOString().slice(0, 10), fim: ate.toISOString().slice(0, 10) },
      truncado: total >= 20_000,
      total,
      horas: +(minutosTotal / 60).toFixed(1),
      retrabalho: { total: retrabalho, percentual: total ? +((retrabalho / total) * 100).toFixed(1) : 0 },
      resumo: {
        preventivas: cont('MP', 'PM'),
        corretivas: cont('MC'),
        visitas: cont('VT'),
        retrabalho,
      },
      tipos,
      tecnicos: [...porTecnico.values()].sort((a, b) => b.total - a.total),
      meses: [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    };
  }

  private async carregar(id: string, user?: AuthUser) {
    const e = await this.prisma.eventoAgenda.findFirst({ where: { id }, include: INCLUDE_EVENTO });
    if (!e || (user?.role === 'tecnico' && e.tecnicoId !== user.id)) {
      throw new NotFoundException('Evento não encontrado');
    }
    return e;
  }

  async buscar(id: string, user: AuthUser) {
    return this.paraResposta(await this.carregar(id, user));
  }

  // ─── Escrita ────────────────────────────────────────────────────────────────

  private validarJanela(inicio: Date, fim: Date) {
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) throw new BadRequestException('Data inválida');
    if (fim <= inicio) throw new BadRequestException('O fim deve ser depois do início');
  }

  async criar(dto: CreateEventoDto) {
    const [tipo, cliente] = await Promise.all([
      dto.tipoServicoId ? this.prisma.tipoServico.findFirst({ where: { id: dto.tipoServicoId } }) : null,
      dto.clienteId ? this.prisma.cliente.findFirst({ where: { id: dto.clienteId, deletedAt: null } }) : null,
    ]);
    if (dto.tipoServicoId && !tipo) throw new NotFoundException('Tipo de serviço não encontrado');
    if (dto.clienteId && !cliente) throw new NotFoundException('Cliente não encontrado');

    const titulo = dto.titulo?.trim()
      || [tipo?.sigla, cliente ? nomeDoCliente(cliente) : null].filter(Boolean).join(' - ');
    if (!titulo) throw new BadRequestException('Informe o título (ou escolha um tipo de serviço / cliente)');

    const inicio = new Date(dto.inicio);
    const fim = dto.fim
      ? new Date(dto.fim)
      : new Date(inicio.getTime() + (tipo?.duracaoMinutos ?? DURACAO_PADRAO_MIN) * 60_000);
    this.validarJanela(inicio, fim);

    const descricao = dto.descricao !== undefined
      ? dto.descricao
      : cliente
        ? [`Cliente: ${nomeDoCliente(cliente)}`, cliente.telefone ? `Telefone: ${cliente.telefone}` : null, `Endereço: ${cliente.endereco}`]
            .filter(Boolean).join('\n')
        : null;

    const criado = await this.prisma.eventoAgenda.create({
      data: {
        titulo,
        descricao: descricao || null,
        local: dto.local !== undefined ? (dto.local || null) : (cliente?.endereco ?? null),
        inicio, fim,
        diaInteiro: dto.diaInteiro ?? false,
        cor: dto.cor ?? null,
        tecnicoId: dto.tecnicoId ?? null,
        clienteId: dto.clienteId ?? null,
        tipoServicoId: dto.tipoServicoId ?? null,
      },
      include: INCLUDE_EVENTO,
    });
    return this.paraResposta(criado);
  }

  async atualizar(id: string, dto: UpdateEventoDto) {
    const atual = await this.carregar(id);
    const os = atual.ordemServico;

    const inicio = dto.inicio ? new Date(dto.inicio) : atual.inicio;
    const fim = dto.fim ? new Date(dto.fim) : atual.fim;
    // Mudou só o início: o evento mantém a duração
    const fimEfetivo = dto.inicio && !dto.fim
      ? new Date(inicio.getTime() + (atual.fim.getTime() - atual.inicio.getTime()))
      : fim;
    const mudouHorario = !!(dto.inicio || dto.fim);
    if (mudouHorario) this.validarJanela(inicio, fimEfetivo);

    const textos = {
      ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() || atual.titulo } : {}),
      ...(dto.descricao !== undefined ? { descricao: dto.descricao || null } : {}),
      ...(dto.local !== undefined ? { local: dto.local || null } : {}),
    };
    const mexeuNosTextos = Object.keys(textos).length > 0;

    if (!os) {
      // Evento avulso: tudo é editável
      if (dto.tipoServicoId) {
        const tipo = await this.prisma.tipoServico.findFirst({ where: { id: dto.tipoServicoId } });
        if (!tipo) throw new NotFoundException('Tipo de serviço não encontrado');
      }
      const salvo = await this.prisma.eventoAgenda.update({
        where: { id },
        data: {
          ...textos,
          ...(mudouHorario ? { inicio, fim: fimEfetivo } : {}),
          ...(dto.diaInteiro !== undefined ? { diaInteiro: dto.diaInteiro } : {}),
          ...(dto.cor !== undefined ? { cor: dto.cor } : {}),
          ...(dto.tecnicoId !== undefined ? { tecnicoId: dto.tecnicoId } : {}),
          ...(dto.clienteId !== undefined ? { clienteId: dto.clienteId } : {}),
          ...(dto.tipoServicoId !== undefined ? { tipoServicoId: dto.tipoServicoId } : {}),
        },
        include: INCLUDE_EVENTO,
      });
      return this.paraResposta(salvo);
    }

    // Evento de O.S.: horário e técnico voltam para a O.S. (ela é a fonte); cliente e tipo vêm dela
    const encerrada = os.status === 'concluida' || os.status === 'cancelada';
    const osData: Prisma.OrdemServicoUpdateInput = {};
    if (mudouHorario) {
      if (encerrada) throw new BadRequestException('Não é possível reagendar uma O.S. encerrada');
      const a = relogioLocal(inicio), b = relogioLocal(fimEfetivo);
      if (a.dia.getTime() !== b.dia.getTime()) {
        throw new BadRequestException('O evento de uma O.S. deve começar e terminar no mesmo dia');
      }
      osData.dataAgendamento = a.dia;
      osData.horaInicio = paraHHMM(a.minutos);
      osData.horaFim = paraHHMM(b.minutos);
    }
    if (dto.tecnicoId !== undefined) {
      if (encerrada) throw new BadRequestException('Não é possível trocar o técnico de uma O.S. encerrada');
      osData.tecnico = dto.tecnicoId ? { connect: { id: dto.tecnicoId } } : { disconnect: true };
    }

    if (mexeuNosTextos || dto.cor !== undefined) {
      await this.prisma.eventoAgenda.update({
        where: { id },
        data: { ...textos, ...(mexeuNosTextos ? { personalizado: true } : {}), ...(dto.cor !== undefined ? { cor: dto.cor } : {}) },
      });
    }
    if (Object.keys(osData).length) {
      await this.prisma.ordemServico.update({ where: { id: os.id }, data: osData });
    }
    await this.sincronizar(os.id);
    return this.paraResposta(await this.carregar(id));
  }

  /** Volta título, descrição e local de um evento de O.S. para o texto gerado pela O.S. */
  async restaurar(id: string) {
    const e = await this.carregar(id);
    if (!e.ordemServico) throw new BadRequestException('Só eventos de O.S. podem ser restaurados');
    await this.prisma.eventoAgenda.update({ where: { id }, data: { personalizado: false, cor: null } });
    await this.sincronizar(e.ordemServico.id);
    return this.paraResposta(await this.carregar(id));
  }

  async remover(id: string) {
    const e = await this.carregar(id);
    if (e.ordemServico) {
      throw new ConflictException(
        `Este evento pertence à O.S. ${numeroDaOs(e.ordemServico, e.tipoServico?.sigla)}. ` +
        'Para tirá-lo da agenda, cancele ou exclua a O.S.',
      );
    }
    await this.prisma.eventoAgenda.delete({ where: { id } });
    return { message: 'Evento excluído' };
  }
}
