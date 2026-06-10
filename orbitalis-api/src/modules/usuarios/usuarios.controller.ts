import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

const SELECT_TECNICO = {
  id: true, email: true, nome: true, telefone: true, especialidade: true, dataCriacao: true,
} as const;

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tecnicos')
  @Roles(UsuarioTipo.admin)
  findTecnicos() {
    return this.prisma.usuario.findMany({
      where: { tipo: 'tecnico' },
      select: SELECT_TECNICO,
      orderBy: { nome: 'asc' },
    });
  }

  @Get(':id')
  @Roles(UsuarioTipo.admin)
  findOne(@Param('id') id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: SELECT_TECNICO,
    });
  }

  @Post()
  @Roles(UsuarioTipo.admin)
  async criarTecnico(@Body() body: { email: string; senha: string; nome?: string; telefone?: string; especialidade?: string }) {
    if (!body.email || !body.senha) throw new BadRequestException('Email e senha são obrigatórios');
    const existe = await this.prisma.usuario.findUnique({ where: { email: body.email } });
    if (existe) throw new BadRequestException('Email já cadastrado');
    const senhaHash = await bcrypt.hash(body.senha, 10);
    return this.prisma.usuario.create({
      data: {
        email: body.email,
        senhaHash,
        tipo: 'tecnico',
        nome: body.nome || null,
        telefone: body.telefone || null,
        especialidade: body.especialidade || null,
      },
      select: SELECT_TECNICO,
    });
  }

  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  async atualizarTecnico(
    @Param('id') id: string,
    @Body() body: { email?: string; senha?: string; nome?: string; telefone?: string; especialidade?: string },
  ) {
    const data: Record<string, string | null> = {};
    if (body.email) data.email = body.email;
    if (body.senha) data.senhaHash = await bcrypt.hash(body.senha, 10);
    if (body.nome !== undefined) data.nome = body.nome || null;
    if (body.telefone !== undefined) data.telefone = body.telefone || null;
    if (body.especialidade !== undefined) data.especialidade = body.especialidade || null;
    if (Object.keys(data).length === 0) return { message: 'Nada a atualizar' };
    return this.prisma.usuario.update({ where: { id }, data, select: SELECT_TECNICO });
  }

  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  async removerTecnico(@Param('id') id: string) {
    await this.prisma.$transaction([
      this.prisma.ordemServico.updateMany({ where: { tecnicoId: id }, data: { tecnicoId: null } }),
      this.prisma.planoManutencao.updateMany({ where: { tecnicoId: id }, data: { tecnicoId: null } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);
    return { message: 'Técnico removido' };
  }
}
