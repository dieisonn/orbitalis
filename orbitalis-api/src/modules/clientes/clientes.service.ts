import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CreateClienteDto, ImportarClientesDto, UpdateClienteDto } from './dto/create-cliente.dto';

const soDigitos = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const limpo = (v?: string | null, max = 255) => {
  const t = (v ?? '').trim();
  return t ? t.slice(0, max) : undefined;
};
const chaveNome = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export type ResultadoImportacao = {
  linha: number;
  nome: string;
  status: 'criado' | 'ignorado' | 'erro';
  mensagem?: string;
};

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto) {
    const documento = soDigitos(dto.documento) || null;
    if (documento) {
      const existe = await this.prisma.cliente.findFirst({ where: { documento } });
      if (existe) throw new ConflictException('Documento já cadastrado');
    }

    // O cadastro do cliente (empresa) é separado do acesso ao portal: não cria login nem
    // senha. O acesso é concedido por convite (o próprio cliente define e-mail e senha).
    const cliente = await this.prisma.cliente.create({
      data: {
        documento,
        razaoSocial: dto.razaoSocial,
        nomeFantasia: dto.nomeFantasia,
        endereco: dto.endereco,
        telefone: dto.telefone,
        celular: dto.celular,
        email: dto.email,
        cidade: dto.cidade,
        uf: dto.uf?.toUpperCase(),
      },
    });

    return { cliente };
  }

  /**
   * Cadastro em lote (planilhas). Cada linha é independente: o resultado diz o que foi criado,
   * o que já existia (ignorado) e o que deu erro. Quem tem documento é identificado por ele;
   * quem não tem, pelo mesmo nome na mesma cidade.
   */
  async importar(linhas: ImportarClientesDto['clientes']): Promise<{
    criados: number; ignorados: number; erros: number; resultados: ResultadoImportacao[];
  }> {
    if (!Array.isArray(linhas) || linhas.length === 0) throw new BadRequestException('Nenhum cliente enviado');

    const existentes = await this.prisma.cliente.findMany({
      where: { deletedAt: null },
      select: { documento: true, razaoSocial: true, cidade: true },
    });
    const docs = new Set(existentes.map((c) => c.documento).filter((d): d is string => !!d));
    const nomes = new Set(existentes.map((c) => `${chaveNome(c.razaoSocial)}|${chaveNome(c.cidade ?? '')}`));

    const resultados: ResultadoImportacao[] = [];
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i] ?? ({} as ImportarClientesDto['clientes'][number]);
      const razaoSocial = limpo(l.razaoSocial);
      const nome = razaoSocial ?? '(sem nome)';
      const registrar = (status: ResultadoImportacao['status'], mensagem?: string) =>
        resultados.push({ linha: i + 1, nome, status, mensagem });

      if (!razaoSocial || razaoSocial.length < 2) { registrar('erro', 'Sem nome'); continue; }

      const documento = soDigitos(l.documento);
      if (documento && documento.length !== 11 && documento.length !== 14) {
        registrar('erro', `Documento com ${documento.length} dígitos (use 11 para CPF ou 14 para CNPJ)`);
        continue;
      }
      const chave = `${chaveNome(razaoSocial)}|${chaveNome(l.cidade ?? '')}`;
      if (documento ? docs.has(documento) : nomes.has(chave)) {
        registrar('ignorado', documento ? 'Documento já cadastrado' : 'Já existe cliente com esse nome e cidade');
        continue;
      }
      let email = limpo(l.email);
      let aviso: string | undefined;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        aviso = `E-mail inválido não importado: ${email}`;
        email = undefined;
      }

      try {
        await this.prisma.cliente.create({
          data: {
            documento: documento || null,
            razaoSocial,
            nomeFantasia: limpo(l.nomeFantasia),
            endereco: limpo(l.endereco, 1000) ?? '',
            telefone: limpo(l.telefone, 20),
            celular: limpo(l.celular, 20),
            email,
            cidade: limpo(l.cidade, 100),
            uf: limpo(l.uf, 2)?.toUpperCase(),
          },
        });
        if (documento) docs.add(documento);
        nomes.add(chave);
        registrar('criado', aviso);
      } catch (e) {
        registrar('erro', e instanceof Error ? e.message.split('\n').pop()?.slice(0, 160) : 'Erro ao salvar');
      }
    }

    return {
      criados: resultados.filter((r) => r.status === 'criado').length,
      ignorados: resultados.filter((r) => r.status === 'ignorado').length,
      erros: resultados.filter((r) => r.status === 'erro').length,
      resultados,
    };
  }

  async consultarCnpj(cnpj: string) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const url = `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`;
    const res = await fetch(url);
    if (!res.ok) throw new NotFoundException('CNPJ não encontrado na Receita Federal');
    return res.json();
  }

  async findAll(page = 1, perPage = 20, q?: string) {
    const skip = (page - 1) * perPage;
    const termo = q?.trim();
    const digitos = termo ? soDigitos(termo) : '';
    const where = {
      deletedAt: null,
      ...(termo
        ? {
            OR: [
              { razaoSocial: { contains: termo, mode: 'insensitive' as const } },
              { nomeFantasia: { contains: termo, mode: 'insensitive' as const } },
              { email: { contains: termo, mode: 'insensitive' as const } },
              { cidade: { contains: termo, mode: 'insensitive' as const } },
              ...(digitos.length >= 3 ? [{ documento: { contains: digitos } }] : []),
            ],
          }
        : {}),
    };
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

  async update(id: string, dto: UpdateClienteDto) {
    await this.findOne(id);
    const { documento: docBruto, uf, ...resto } = dto;
    const data: Record<string, unknown> = { ...resto };
    // campos opcionais vazios limpam o valor
    for (const k of ['nomeFantasia', 'telefone', 'celular', 'email', 'cidade'] as const) {
      if (data[k] === '') data[k] = null;
    }
    if (uf !== undefined) data.uf = uf ? uf.toUpperCase() : null;
    if (docBruto !== undefined) {
      const documento = soDigitos(docBruto);
      if (documento && documento.length !== 11 && documento.length !== 14) {
        throw new BadRequestException('Documento deve ter 11 dígitos (CPF) ou 14 (CNPJ)');
      }
      if (documento) {
        const outro = await this.prisma.cliente.findFirst({ where: { documento, NOT: { id } } });
        if (outro) throw new ConflictException('Documento já cadastrado em outro cliente');
      }
      data.documento = documento || null;
    }
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
