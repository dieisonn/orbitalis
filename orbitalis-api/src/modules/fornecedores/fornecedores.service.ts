import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarCpfCnpj } from '../../common/documento';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';

// string vazia → null (limpa o campo); undefined → não mexe
const vazioNulo = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(q?: string, ativo?: string) {
    const termo = q?.trim();
    const where: Prisma.FornecedorWhereInput = {
      deletedAt: null,
      ...(ativo === 'true' ? { ativo: true } : ativo === 'false' ? { ativo: false } : {}),
      ...(termo
        ? {
            OR: [
              { razaoSocial: { contains: termo, mode: 'insensitive' } },
              { nomeFantasia: { contains: termo, mode: 'insensitive' } },
              { cpfCnpj: { contains: termo.replace(/\D/g, '') || '§', mode: 'insensitive' } },
              { cidade: { contains: termo, mode: 'insensitive' } },
              { contato: { contains: termo, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.fornecedor.findMany({
      where,
      orderBy: { razaoSocial: 'asc' },
      take: 500,
      include: { _count: { select: { produtos: { where: { deletedAt: null } } } } },
    });
  }

  async buscar(id: string) {
    const f = await this.prisma.fornecedor.findFirst({ where: { id, deletedAt: null } });
    if (!f) throw new NotFoundException('Fornecedor não encontrado');
    return f;
  }

  private documento(valor: string | undefined, tipo: 'F' | 'J'): string | null | undefined {
    if (valor === undefined) return undefined;
    try {
      return normalizarCpfCnpj(valor, tipo);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private async garantirDocumentoLivre(cpfCnpj: string | null | undefined, ignorarId?: string) {
    if (!cpfCnpj) return;
    const outro = await this.prisma.fornecedor.findFirst({
      where: { cpfCnpj, deletedAt: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      select: { razaoSocial: true },
    });
    if (outro) throw new ConflictException(`Documento já cadastrado no fornecedor "${outro.razaoSocial}"`);
  }

  async criar(dto: CreateFornecedorDto) {
    const tipoPessoa = dto.tipoPessoa ?? 'J';
    const cpfCnpj = this.documento(dto.cpfCnpj, tipoPessoa) ?? null;
    await this.garantirDocumentoLivre(cpfCnpj);
    return this.prisma.fornecedor.create({
      data: {
        tipoPessoa,
        razaoSocial: dto.razaoSocial.trim(),
        nomeFantasia: vazioNulo(dto.nomeFantasia),
        cpfCnpj,
        inscricaoEstadual: vazioNulo(dto.inscricaoEstadual),
        email: vazioNulo(dto.email),
        telefone: vazioNulo(dto.telefone),
        celular: vazioNulo(dto.celular),
        contato: vazioNulo(dto.contato),
        cep: vazioNulo(dto.cep),
        logradouro: vazioNulo(dto.logradouro),
        numeroEndereco: vazioNulo(dto.numeroEndereco),
        complemento: vazioNulo(dto.complemento),
        bairro: vazioNulo(dto.bairro),
        cidade: vazioNulo(dto.cidade),
        uf: vazioNulo(dto.uf)?.toUpperCase(),
        observacoes: vazioNulo(dto.observacoes),
      },
    });
  }

  async atualizar(id: string, dto: UpdateFornecedorDto) {
    const atual = await this.buscar(id);
    const tipoPessoa = dto.tipoPessoa ?? (atual.tipoPessoa as 'F' | 'J');
    // trocar o tipo revalida o documento já gravado
    const cpfCnpj = this.documento(dto.cpfCnpj ?? (dto.tipoPessoa ? (atual.cpfCnpj ?? '') : undefined), tipoPessoa);
    await this.garantirDocumentoLivre(cpfCnpj, id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: {
        tipoPessoa: dto.tipoPessoa,
        razaoSocial: dto.razaoSocial?.trim(),
        nomeFantasia: vazioNulo(dto.nomeFantasia),
        cpfCnpj,
        inscricaoEstadual: vazioNulo(dto.inscricaoEstadual),
        email: vazioNulo(dto.email),
        telefone: vazioNulo(dto.telefone),
        celular: vazioNulo(dto.celular),
        contato: vazioNulo(dto.contato),
        cep: vazioNulo(dto.cep),
        logradouro: vazioNulo(dto.logradouro),
        numeroEndereco: vazioNulo(dto.numeroEndereco),
        complemento: vazioNulo(dto.complemento),
        bairro: vazioNulo(dto.bairro),
        cidade: vazioNulo(dto.cidade),
        uf: vazioNulo(dto.uf)?.toUpperCase(),
        observacoes: vazioNulo(dto.observacoes),
        ativo: dto.ativo,
      },
    });
  }

  /** Exclusão lógica; o histórico de estoque e os produtos continuam apontando para o registro. */
  async excluir(id: string) {
    await this.buscar(id);
    await this.prisma.fornecedor.update({ where: { id }, data: { deletedAt: new Date(), ativo: false, cpfCnpj: null } });
    return { ok: true };
  }
}
