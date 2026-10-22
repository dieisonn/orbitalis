import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeriadosService } from '../feriados/feriados.service';
import { dataDoCiclo } from '../cron/geracao-preventiva';

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
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
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
        for (let n = 0; n < 400; n++) {
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
