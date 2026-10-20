import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto) {
    const existe = await this.prisma.cliente.findFirst({
      where: { documento: dto.documento },
    });
    if (existe) throw new ConflictException('Documento já cadastrado');

    // O cadastro do cliente (empresa) é separado do acesso ao portal: não cria login nem
    // senha. O acesso é concedido por convite (o próprio cliente define e-mail e senha).
    const cliente = await this.prisma.cliente.create({
      data: {
        documento: dto.documento,
        razaoSocial: dto.razaoSocial,
        nomeFantasia: dto.nomeFantasia,
        endereco: dto.endereco,
        telefone: dto.telefone,
      },
    });

    return { cliente };
  }

  async consultarCnpj(cnpj: string) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const url = `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`;
    const res = await fetch(url);
    if (!res.ok) throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    return res.json();
  }

  async findAll(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        include: { ambientes: { where: { deletedAt: null } } },
        orderBy: { razaoSocial: 'asc' },
        skip,
        take: perPage,
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { data, total, page, perPage };
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        ambientes: {
          where: { deletedAt: null },
          include: { equipamentos: { where: { deletedAt: null }, orderBy: { nome: 'asc' } } },
          orderBy: { nome: 'asc' },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  async dashboard(id: string) {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    const cliente = await this.findOne(id);

    const ambienteIds = cliente.ambientes.map((a: any) => a.id);

    const [osResumo, custoTotal, contrato, proximaOs] = await Promise.all([
      this.prisma.ordemServico.groupBy({
        by: ['status'],
        where: { ambienteId: { in: ambienteIds } },
        _count: { _all: true },
      }),
      this.prisma.ordemServico.findMany({
        where: { ambienteId: { in: ambienteIds }, status: 'concluida' },
        select: { valorMaoObra: true, valorPecas: true },
      }),
      this.prisma.contrato.findFirst({
        where: { clienteId: id, ativo: true },
        orderBy: { vigenciaFim: 'desc' },
      }),
      this.prisma.ordemServico.findFirst({
        where: {
          ambienteId: { in: ambienteIds },
          status: { in: ['agendada', 'em_andamento'] },
          dataAgendamento: { gte: agora },
        },
        orderBy: { dataAgendamento: 'asc' },
        select: { id: true, dataAgendamento: true, tipo: true, ambiente: { select: { nome: true } } },
      }),
    ]);

    const porStatus = osResumo.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const custoTotalGeral = custoTotal.reduce(
      (s, o) => s + Number(o.valorMaoObra ?? 0) + Number(o.valorPecas ?? 0),
      0,
    );

    const osDoMes = await this.prisma.ordemServico.count({
      where: { ambienteId: { in: ambienteIds }, dataAgendamento: { gte: inicioMes, lte: fimMes } },
    });

    const ultimasOs = await this.prisma.ordemServico.findMany({
      where: { ambienteId: { in: ambienteIds } },
      orderBy: { dataAgendamento: 'desc' },
      take: 5,
      select: {
        id: true, numero: true, status: true, tipo: true, dataAgendamento: true, dataConclusao: true,
        ambiente: { select: { nome: true } },
        tecnico: { select: { nome: true, email: true } },
      },
    });

    const totalEquipamentos = cliente.ambientes.reduce(
      (s: number, a: any) => s + (a.equipamentos?.length ?? 0),
      0,
    );

    return {
      porStatus,
      custoTotalGeral,
      osDoMes,
      contrato,
      proximaOs,
      ultimasOs,
      totalAmbientes: cliente.ambientes.length,
      totalEquipamentos,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    // Não deixa O.S. em aberto nem plano ativo "órfãos" na agenda dos técnicos
    const [osAbertas, planosAtivos] = await Promise.all([
      this.prisma.ordemServico.count({
        where: {
          status: { in: ['aberta', 'agendada', 'em_andamento'] },
          ambiente: { clienteId: id },
        },
      }),
      this.prisma.planoManutencao.count({ where: { clienteId: id, ativo: true } }),
    ]);
    if (osAbertas > 0 || planosAtivos > 0) {
      const partes = [
        osAbertas > 0 ? `${osAbertas} O.S. em aberto` : null,
        planosAtivos > 0 ? `${planosAtivos} plano(s) preventivo(s) ativo(s)` : null,
      ].filter(Boolean);
      throw new ConflictException(
        `Este cliente tem ${partes.join(' e ')}. Conclua ou cancele as O.S. e desative os planos antes de excluir.`,
      );
    }
    // Soft delete (§6.5) — UPDATE deleted_at em vez de DELETE
    return this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(id: string, data: { razaoSocial?: string; nomeFantasia?: string; endereco?: string; telefone?: string }) {
    await this.findOne(id);
    return this.prisma.cliente.update({ where: { id }, data });
  }

  // GET /clientes/meu-perfil — retorna o perfil do cliente autenticado com seus ambientes
  async meuPerfil(usuarioId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { usuarioId, deletedAt: null },
      include: {
        ambientes: {
          where: { deletedAt: null },
          include: {
            equipamentos: { where: { deletedAt: null } },
            ordensServico: {
              orderBy: { dataAgendamento: 'desc' },
              take: 5,
              select: {
                id: true,
                status: true,
                origem: true,
                dataAgendamento: true,
                dataConclusao: true,
              },
            },
          },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Perfil de cliente não encontrado');
    return cliente;
  }
}
