import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
}
