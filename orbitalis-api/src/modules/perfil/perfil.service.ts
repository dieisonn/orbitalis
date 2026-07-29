import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';

const SELECT = {
  id: true,
  email: true,
  nome: true,
  telefone: true,
  especialidade: true,
  crea: true,
  tipo: true,
  dataCriacao: true,
} as const;

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  getMeu(userId: string) {
    return this.prisma.usuario.findUnique({ where: { id: userId }, select: SELECT });
  }

  async update(userId: string, dto: UpdatePerfilDto) {
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined)         data.nome         = dto.nome         || null;
    if (dto.telefone !== undefined)     data.telefone     = dto.telefone     || null;
    if (dto.especialidade !== undefined) data.especialidade = dto.especialidade || null;
    if (dto.crea !== undefined)         data.crea         = dto.crea         || null;
    if (Object.keys(data).length === 0) return this.getMeu(userId);
    return this.prisma.usuario.update({ where: { id: userId }, data, select: SELECT });
  }

  async trocarSenha(userId: string, dto: TrocarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { senhaHash: true },
    });
    if (!usuario) throw new NotFoundException();

    const valida = await bcrypt.compare(dto.senhaAtual, usuario.senhaHash);
    if (!valida) throw new BadRequestException('Senha atual incorreta');

    const senhaHash = await bcrypt.hash(dto.novaSenha, 10);
    await this.prisma.usuario.update({ where: { id: userId }, data: { senhaHash } });
  }
}
