import { Injectable } from '@nestjs/common';
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
};

@Injectable()
export class ConfiguracaoEmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.configuracaoEmpresa.findFirst();
    return config ?? {
      id: null,
      nomeEmpresa: 'Orbitalis',
      nomeFantasia: null,
      logoUrl: null,
      corPrimaria: '#0505ad',
      cnpj: null,
      telefone: null,
      endereco: null,
      updatedAt: new Date(),
    };
  }

  async upsert(data: UpsertDto) {
    const existing = await this.prisma.configuracaoEmpresa.findFirst();
    if (existing) {
      return this.prisma.configuracaoEmpresa.update({ where: { id: existing.id }, data });
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
      },
    });
  }
}
