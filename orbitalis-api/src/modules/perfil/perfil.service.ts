import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { permissoesEfetivas } from '../../common/modulos';
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
  perfilAcesso: true,
  permissoes: true,
} as const;

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeu(userId: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id: userId }, select: SELECT });
    if (!u) return u;
    // `acesso`: null = tudo; lista = módulos liberados (o menu e as rotas seguem isso)
    const { perfilAcesso, permissoes, ...resto } = u;
    return { ...resto, perfilAcesso, acesso: resto.tipo === 'admin' ? permissoesEfetivas(perfilAcesso, permissoes) : null };
  }

  async update(userId: string, dto: UpdatePerfilDto) {
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined)         data.nome         = dto.nome         || null;
    if (dto.telefone !== undefined)     data.telefone     = dto.telefone     || null;
    if (dto.especialidade !== undefined) data.especialidade = dto.especialidade || null;
    if (dto.crea !== undefined)         data.crea         = dto.crea         || null;
    if (Object.keys(data).length === 0) return this.getMeu(userId);
    await this.prisma.usuario.update({ where: { id: userId }, data });
    return this.getMeu(userId);
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
