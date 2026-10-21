import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_ID = '00000000-0000-0000-0000-000000000001';

type UpsertDto = {
  nomeEmpresa?: string;
  nomeFantasia?: string;
  logoUrl?: string;
  corPrimaria?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string | null;
  uf?: string | null;
  codigoIbge?: string | null;
  responsavelTecnicoId?: string | null;
  mttrLimiteHoras?: number | null;
  mtbfLimiteDias?: number | null;
  custoHoraParada?: number | null;
};

const INCLUDE_RESPONSAVEL = {
  responsavelTecnico: { select: { id: true, nome: true, email: true, crea: true } },
} as const;

const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

/** Valida e normaliza cidade/UF/IBGE (vazio limpa o campo). */
function normalizarLocalizacao(d: { cidade?: string | null; uf?: string | null; codigoIbge?: string | null }) {
  const out: { cidade?: string | null; uf?: string | null; codigoIbge?: string | null } = {};
  if (d.cidade !== undefined) {
    const v = (d.cidade ?? '').trim();
    if (v.length > 120) throw new BadRequestException('Cidade: no máximo 120 caracteres');
    out.cidade = v || null;
  }
  if (d.uf !== undefined) {
    const v = (d.uf ?? '').trim().toUpperCase();
    if (v && !UFS.has(v)) throw new BadRequestException('UF inválida');
    out.uf = v || null;
  }
  if (d.codigoIbge !== undefined) {
    const v = (d.codigoIbge ?? '').trim();
    if (v && !/^\d{7}$/.test(v)) throw new BadRequestException('O código IBGE do município tem 7 dígitos');
    out.codigoIbge = v || null;
  }
  return out;
}

@Injectable()
export class ConfiguracaoEmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.configuracaoEmpresa.findFirst({ include: INCLUDE_RESPONSAVEL });
    return config ?? {
      id: null,
      nomeEmpresa: 'Orbitalis',
      nomeFantasia: null,
      logoUrl: null,
      corPrimaria: '#0505ad',
      cnpj: null,
      telefone: null,
      endereco: null,
      cidade: null,
      uf: null,
      codigoIbge: null,
      updatedAt: new Date(),
      responsavelTecnicoId: null,
      responsavelTecnico: null,
      mttrLimiteHoras: null,
      mtbfLimiteDias: null,
      custoHoraParada: null,
    };
  }

  async upsert(data: UpsertDto) {
    const { responsavelTecnicoId, cidade, uf, codigoIbge, ...rest } = data;
    const local = normalizarLocalizacao({ cidade, uf, codigoIbge });
    const existing = await this.prisma.configuracaoEmpresa.findFirst();

    const updateData: any = { ...rest, ...local };
    if (responsavelTecnicoId !== undefined) {
      updateData.responsavelTecnicoId = responsavelTecnicoId || null;
    }

    if (existing) {
      return this.prisma.configuracaoEmpresa.update({
        where: { id: existing.id },
        data: updateData,
        include: INCLUDE_RESPONSAVEL,
      });
    }
    return this.prisma.configuracaoEmpresa.create({
      data: {
        id: DEFAULT_ID,
        nomeEmpresa: data.nomeEmpresa ?? 'Orbitalis',
        nomeFantasia: data.nomeFantasia ?? null,
        logoUrl: data.logoUrl ?? null,
        corPrimaria: data.corPrimaria ?? '#0505ad',
        cnpj: data.cnpj ?? null,
        telefone: data.telefone ?? null,
        endereco: data.endereco ?? null,
        cidade: local.cidade ?? null,
        uf: local.uf ?? null,
        codigoIbge: local.codigoIbge ?? null,
        responsavelTecnicoId: responsavelTecnicoId || null,
      },
      include: INCLUDE_RESPONSAVEL,
    });
  }
}
