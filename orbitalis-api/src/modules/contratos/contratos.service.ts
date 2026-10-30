import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeriadosService } from '../feriados/feriados.service';
import { dataDoCiclo, visitasRestantes } from '../cron/geracao-preventiva';

export type VisitaCalendario = {
  data: string;                 // YYYY-MM-DD
  situacao: 'prevista' | 'aberta' | 'agendada' | 'em_andamento' | 'concluida';
  osId: string | null;          // null = ainda não gerada (prevista pelo plano)
  osNumero: number | null;
  tipoServico: { id: string; sigla: string; nome: string; corHex: string } | null;
  tecnico: string | null;
  ambientes: { nome: string; equipamentos: string[] }[];
};

export type Consumo = {
  planos: number;
  osGeradas: number;      // O.S. dos planos vinculados (canceladas não contam)
  osConcluidas: number;
  osEmAberto: number;
  osNoMes: number;        // O.S. com visita no mês corrente
  osIncluidasMes: number | null;     // O.S. incluídas por mês no contrato
  saldoMes: number | null;
  excedeuMes: boolean;
  meses: number;          // duração da vigência
  osIncluidasPeriodo: number | null; // incluídas por mês × meses
  excedeuPeriodo: boolean;
};

export type RenovarContratoInput = {
  descricao?: string;
  valorMensal?: number | null;
  vigenciaInicio: string;
  vigenciaFim: string;
  numOsIncluidas?: number | null;
  observacoes?: string | null;
  // Por plano do contrato antigo: equipamentos que continuam (ou entram) e as visitas por equipamento
  planos: { planoId: string; equipamentoIds: string[]; visitasPrevistas?: number }[];
};

@Injectable()
export class ContratosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feriados: FeriadosService,
  ) {}

  /**
   * Consumo do contrato: O.S. geradas pelos planos preventivos vinculados a ele (canceladas
   * não contam) frente às O.S. incluídas. `numOsIncluidas` é POR MÊS (como a tela de contratos já informa).
   */
  private async anexarConsumo<
    T extends { id: string; numOsIncluidas: number | null; vigenciaInicio: Date; vigenciaFim: Date },
  >(contratos: T[]) {
    if (contratos.length === 0) return [] as (T & { consumo: Consumo })[];

    const planos = await this.prisma.planoManutencao.findMany({
      where: { contratoId: { in: contratos.map((c) => c.id) } },
      select: { id: true, contratoId: true },
    });
    const contratoDoPlano = new Map(planos.map((p) => [p.id, p.contratoId as string]));

    const ordens = planos.length
      ? await this.prisma.ordemServico.findMany({
          where: { planoId: { in: planos.map((p) => p.id) }, status: { not: 'cancelada' } },
          select: { planoId: true, status: true, dataAgendamento: true },
        })
      : [];

    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${agora.getMonth()}`;

    return contratos.map((c) => {
      let concluidas = 0;
      let emAberto = 0;
      let noMes = 0;
      for (const o of ordens) {
        if (!o.planoId || contratoDoPlano.get(o.planoId) !== c.id) continue;
        if (o.status === 'concluida') concluidas++;
        else emAberto++;
        const d = o.dataAgendamento;
        if (`${d.getFullYear()}-${d.getMonth()}` === mesAtual) noMes++;
      }
      const geradas = concluidas + emAberto;
      const porMes = c.numOsIncluidas;
      const meses = Math.max(1, Math.round((c.vigenciaFim.getTime() - c.vigenciaInicio.getTime()) / (30 * 86_400_000)));
      const periodo = porMes != null ? porMes * meses : null;
      return {
        ...c,
        consumo: {
          planos: planos.filter((p) => p.contratoId === c.id).length,
          osGeradas: geradas,
          osConcluidas: concluidas,
          osEmAberto: emAberto,
          osNoMes: noMes,
          osIncluidasMes: porMes,
          saldoMes: porMes != null ? porMes - noMes : null,
          excedeuMes: porMes != null && noMes > porMes,
          meses,
          osIncluidasPeriodo: periodo,
          excedeuPeriodo: periodo != null && geradas > periodo,
        } as Consumo,
      };
    });
  }

  async findAll(clienteId?: string) {
    const contratos = await this.prisma.contrato.findMany({
      where: clienteId ? { clienteId } : undefined,
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } }, renovacoes: { select: { id: true } } },
      orderBy: { vigenciaFim: 'asc' },
    });
    return this.anexarConsumo(contratos);
  }

  async findOne(id: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        planos: { select: { id: true, ativo: true, frequenciaDias: true, proximaGeracao: true, dataFim: true } },
        renovadoDe: { select: { id: true, descricao: true, vigenciaInicio: true, vigenciaFim: true } },
        renovacoes: { select: { id: true, descricao: true, vigenciaInicio: true, vigenciaFim: true } },
      },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');
    const [comConsumo] = await this.anexarConsumo([contrato]);
    return comConsumo;
  }

  async create(data: {
    clienteId: string;
    descricao: string;
    valorMensal?: number;
    vigenciaInicio: string;
    vigenciaFim: string;
    numOsIncluidas?: number;
    observacoes?: string;
  }) {
    return this.prisma.contrato.create({
      data: {
        clienteId: data.clienteId,
        descricao: data.descricao,
        valorMensal: data.valorMensal ?? null,
        vigenciaInicio: new Date(data.vigenciaInicio),
        vigenciaFim: new Date(data.vigenciaFim),
        numOsIncluidas: data.numOsIncluidas ?? null,
        observacoes: data.observacoes ?? null,
      },
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
    });
  }

  async update(id: string, data: Partial<{
    descricao: string;
    valorMensal: number | null;
    vigenciaInicio: string;
    vigenciaFim: string;
    numOsIncluidas: number | null;
    observacoes: string | null;
    ativo: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.contrato.update({
      where: { id },
      data: {
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.valorMensal !== undefined && { valorMensal: data.valorMensal }),
        ...(data.vigenciaInicio !== undefined && { vigenciaInicio: new Date(data.vigenciaInicio) }),
        ...(data.vigenciaFim !== undefined && { vigenciaFim: new Date(data.vigenciaFim) }),
        ...(data.numOsIncluidas !== undefined && { numOsIncluidas: data.numOsIncluidas }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
    });
  }

  /** Tudo que a tela de renovação precisa: dados atuais (para manter ou mudar), planos com equipamentos e datas sugeridas. */
  async renovacaoPreview(id: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        renovacoes: { select: { id: true } },
        planos: {
          where: { ativo: true },
          orderBy: { proximaGeracao: 'asc' },
          include: {
            tipoServico: { select: { sigla: true, nome: true } },
            equipamentosConfig: {
              where: { equipamento: { deletedAt: null } },
              include: { equipamento: { select: { id: true, nome: true, tipoEquipamento: true, ambiente: { select: { nome: true } } } } },
            },
          },
        },
      },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');

    const noPlano = new Set(contrato.planos.flatMap((p) => p.equipamentosConfig.map((c) => c.equipamentoId)));
    const outros = await this.prisma.equipamento.findMany({
      where: { deletedAt: null, ambiente: { clienteId: contrato.clienteId, deletedAt: null }, id: { notIn: [...noPlano] } },
      select: { id: true, nome: true, tipoEquipamento: true, ambiente: { select: { nome: true } } },
      orderBy: [{ ambiente: { nome: 'asc' } }, { nome: 'asc' }],
    });

    const dia = 86_400_000;
    const duracao = contrato.vigenciaFim.getTime() - contrato.vigenciaInicio.getTime();
    const sugeridoInicio = new Date(contrato.vigenciaFim.getTime() + dia);
    // Mesma duração em meses (12 meses → de 01/11 a 31/10 do ano seguinte), sem derrapar em ano bissexto
    const meses = Math.max(1, Math.round((duracao + dia) / (30.4375 * dia)));
    const sugeridoFim = new Date(Date.UTC(sugeridoInicio.getUTCFullYear(), sugeridoInicio.getUTCMonth() + meses, sugeridoInicio.getUTCDate()) - dia);
    return {
      jaRenovado: contrato.renovacoes.length > 0,
      contrato: {
        id: contrato.id, descricao: contrato.descricao, valorMensal: contrato.valorMensal,
        numOsIncluidas: contrato.numOsIncluidas, observacoes: contrato.observacoes,
        vigenciaInicio: contrato.vigenciaInicio, vigenciaFim: contrato.vigenciaFim, cliente: contrato.cliente,
      },
      sugestao: { vigenciaInicio: sugeridoInicio, vigenciaFim: sugeridoFim },
      planos: contrato.planos.map((p) => ({
        id: p.id, frequenciaDias: p.frequenciaDias, visitasPrevistas: p.visitasPrevistas, tipoServico: p.tipoServico,
        equipamentos: p.equipamentosConfig.map((c) => ({ ...c.equipamento, ambiente: c.equipamento.ambiente.nome })),
      })),
      outrosEquipamentos: outros.map((e) => ({ ...e, ambiente: e.ambiente.nome })),
    };
  }

  /**
   * Renova um contrato: cria um contrato novo (com os valores mantidos ou alterados) e, para cada plano
   * preventivo ativo, um plano novo com os equipamentos escolhidos e as novas datas. O contrato e os
   * planos antigos ficam no histórico (encerrados), com suas O.S. intactas.
   */
  async renovar(id: string, dto: RenovarContratoInput) {
    const antigo = await this.prisma.contrato.findUnique({
      where: { id },
      include: { renovacoes: { select: { id: true } }, planos: { where: { ativo: true }, include: { equipamentosConfig: true } } },
    });
    if (!antigo) throw new NotFoundException('Contrato não encontrado');
    if (antigo.renovacoes.length > 0) throw new ConflictException('Este contrato já foi renovado');

    const inicio = new Date(dto.vigenciaInicio);
    const fim = new Date(dto.vigenciaFim);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) throw new BadRequestException('Informe a vigência do novo contrato');
    if (fim <= inicio) throw new BadRequestException('O fim da vigência deve ser depois do início');
    if (dto.valorMensal != null && (isNaN(Number(dto.valorMensal)) || Number(dto.valorMensal) < 0)) throw new BadRequestException('Valor mensal inválido');

    const escolhas = new Map((dto.planos ?? []).map((p) => [p.planoId, p]));
    for (const pid of escolhas.keys()) {
      if (!antigo.planos.some((p) => p.id === pid)) throw new BadRequestException('Plano não pertence a este contrato');
    }
    const todosIds = [...new Set([...escolhas.values()].flatMap((p) => p.equipamentoIds))];
    if (todosIds.length) {
      const validos = await this.prisma.equipamento.count({ where: { id: { in: todosIds }, deletedAt: null, ambiente: { clienteId: antigo.clienteId } } });
      if (validos !== todosIds.length) throw new BadRequestException('Há equipamento que não pertence ao cliente do contrato');
    }

    return this.prisma.$transaction(async (tx) => {
      const novo = await tx.contrato.create({
        data: {
          clienteId: antigo.clienteId,
          descricao: dto.descricao?.trim() || antigo.descricao,
          valorMensal: dto.valorMensal === undefined ? antigo.valorMensal : dto.valorMensal,
          vigenciaInicio: inicio,
          vigenciaFim: fim,
          numOsIncluidas: dto.numOsIncluidas === undefined ? antigo.numOsIncluidas : dto.numOsIncluidas,
          observacoes: dto.observacoes === undefined ? antigo.observacoes : (dto.observacoes?.trim() || null),
          renovadoDeId: antigo.id,
          empresaId: antigo.empresaId,
        },
      });

      let planosCriados = 0;
      for (const velho of antigo.planos) {
        const esc = escolhas.get(velho.id);
        if (!esc || esc.equipamentoIds.length === 0) continue;   // plano sem equipamentos não é renovado
        const modelos = new Map(velho.equipamentosConfig.map((c) => [c.equipamentoId, c.modeloChecklistId]));
        await tx.planoManutencao.create({
          data: {
            clienteId: velho.clienteId,
            tecnicoId: velho.tecnicoId,
            tipoServicoId: velho.tipoServicoId,
            contratoId: novo.id,
            frequenciaDias: velho.frequenciaDias,
            visitasPrevistas: esc.visitasPrevistas ?? velho.visitasPrevistas,
            agrupamento: velho.agrupamento,
            maxEquipamentosPorOs: velho.maxEquipamentosPorOs,
            horaInicio: velho.horaInicio,
            horaFim: velho.horaFim,
            proximaGeracao: inicio,
            dataFim: fim,
            ativo: true,
            empresaId: velho.empresaId,
            equipamentosConfig: {
              create: esc.equipamentoIds.map((eid) => ({ equipamentoId: eid, modeloChecklistId: modelos.get(eid) ?? null })),
            },
          },
        });
        planosCriados++;
      }

      // O contrato antigo vira histórico: encerrado, e seus planos param de gerar O.S.
      await tx.planoManutencao.updateMany({ where: { contratoId: antigo.id, ativo: true }, data: { ativo: false } });
      await tx.contrato.update({ where: { id: antigo.id }, data: { ativo: false } });

      return { id: novo.id, planosCriados };
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contrato.delete({ where: { id } });
  }

  /**
   * Calendário do contrato num ano: visitas (O.S. já geradas pelos planos preventivos vinculados +
   * as previstas, ainda não geradas) e os feriados. Só existe para contratos — sem plano vinculado
   * a lista de visitas vem vazia.
   */
  async calendario(id: string, anoParam?: number) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');

    const anoIni = contrato.vigenciaInicio.getUTCFullYear();
    const anoFim = contrato.vigenciaFim.getUTCFullYear();
    const hoje = new Date().getUTCFullYear();
    const ano = anoParam ?? Math.min(Math.max(hoje, anoIni), anoFim);
    if (!Number.isInteger(ano) || ano < 1970 || ano > 2100) throw new BadRequestException('Ano inválido');

    const dia0 = new Date(Date.UTC(ano, 0, 1));
    const dia1 = new Date(Date.UTC(ano + 1, 0, 1));
    const dentro = (d: Date) => d >= dia0 && d < dia1;
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const planos = await this.prisma.planoManutencao.findMany({
      where: { contratoId: id },
      include: {
        tipoServico: { select: { id: true, sigla: true, nome: true, corHex: true } },
        tecnico: { select: { nome: true } },
        equipamentosConfig: {
          where: { equipamento: { deletedAt: null, ambiente: { deletedAt: null } } },
          select: { equipamento: { select: { nome: true, ambiente: { select: { id: true, nome: true } } } } },
        },
      },
    });

    const visitas: VisitaCalendario[] = [];
    const jaGeradas = new Set<string>(); // plano|dia — evita duplicar a prevista de uma O.S. existente

    if (planos.length) {
      const ordens = await this.prisma.ordemServico.findMany({
        where: {
          planoId: { in: planos.map((p) => p.id) },
          status: { not: 'cancelada' },
          dataAgendamento: { gte: dia0, lt: dia1 },
        },
        include: {
          tecnico: { select: { nome: true } },
          ambiente: { select: { nome: true } },
          itens: { select: { equipamento: { select: { nome: true } } } },
        },
        orderBy: { dataAgendamento: 'asc' },
      });
      const doPlano = new Map(planos.map((p) => [p.id, p]));
      for (const o of ordens) {
        const plano = doPlano.get(o.planoId as string)!;
        const data = iso(o.dataAgendamento);
        jaGeradas.add(`${plano.id}|${data}`);
        visitas.push({
          data,
          situacao: o.status as VisitaCalendario['situacao'],
          osId: o.id,
          osNumero: o.numero,
          tipoServico: plano.tipoServico,
          tecnico: o.tecnico?.nome ?? plano.tecnico?.nome ?? null,
          ambientes: [{ nome: o.ambiente.nome, equipamentos: o.itens.map((i) => i.equipamento.nome) }],
        });
      }

      // Previstas: ciclos futuros do plano (ainda sem O.S.), até o fim do plano ou do contrato
      for (const plano of planos) {
        if (!plano.ativo) continue;
        const limite = [plano.dataFim, contrato.vigenciaFim].filter((d): d is Date => !!d).reduce((a, b) => (a < b ? a : b));
        const porAmbiente = new Map<string, { nome: string; equipamentos: string[] }>();
        for (const c of plano.equipamentosConfig) {
          const amb = c.equipamento.ambiente;
          const atual = porAmbiente.get(amb.id) ?? { nome: amb.nome, equipamentos: [] };
          atual.equipamentos.push(c.equipamento.nome);
          porAmbiente.set(amb.id, atual);
        }
        const restantes = visitasRestantes(plano);
        for (let n = 0; n < Math.min(400, restantes); n++) {
          const d = dataDoCiclo(plano.proximaGeracao, plano.frequenciaDias, n);
          if (d > limite || d >= dia1) break;
          if (!dentro(d) || jaGeradas.has(`${plano.id}|${iso(d)}`)) continue;
          visitas.push({
            data: iso(d),
            situacao: 'prevista',
            osId: null,
            osNumero: null,
            tipoServico: plano.tipoServico,
            tecnico: plano.tecnico?.nome ?? null,
            ambientes: [...porAmbiente.values()],
          });
        }
      }
    }
    visitas.sort((a, b) => a.data.localeCompare(b.data));

    const feriados = await this.feriados.listar(ano);
    return {
      contrato: {
        id: contrato.id,
        descricao: contrato.descricao,
        vigenciaInicio: contrato.vigenciaInicio,
        vigenciaFim: contrato.vigenciaFim,
        numOsIncluidas: contrato.numOsIncluidas,
        cliente: contrato.cliente,
      },
      ano,
      anosDaVigencia: Array.from({ length: anoFim - anoIni + 1 }, (_, i) => anoIni + i),
      visitas,
      feriados: feriados.map(({ data, nome, tipo }) => ({ data, nome, tipo })),
    };
  }
}
