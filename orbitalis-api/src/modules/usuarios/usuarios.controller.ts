import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioTipo } from '@prisma/client';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/v1/usuarios/tecnicos — lista técnicos para dropdown de triagem
  @Get('tecnicos')
  @Roles(UsuarioTipo.admin)
  findTecnicos() {
    return this.prisma.usuario.findMany({
      where: { tipo: 'tecnico' },
      select: { id: true, email: true, dataCriacao: true },
      orderBy: { email: 'asc' },
    });
  }

  // GET /api/v1/usuarios/:id — Admin busca técnico por ID
  @Get(':id')
  @Roles(UsuarioTipo.admin)
  findOne(@Param('id') id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, tipo: true, dataCriacao: true },
    });
  }

  // POST /api/v1/usuarios — Admin cria técnico
  @Post()
  @Roles(UsuarioTipo.admin)
  async criarTecnico(@Body() body: { email: string; senha: string }) {
    if (!body.email || !body.senha) {
      throw new BadRequestException('Email e senha são obrigatórios');
    }

    const existe = await this.prisma.usuario.findUnique({
      where: { email: body.email },
    });
    if (existe) throw new BadRequestException('Email já cadastrado');

    const senhaHash = await bcrypt.hash(body.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: { email: body.email, senhaHash, tipo: 'tecnico' },
      select: { id: true, email: true, tipo: true, dataCriacao: true },
    });
    return usuario;
  }

  // PATCH /api/v1/usuarios/:id — Admin edita técnico
  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  async atualizarTecnico(
    @Param('id') id: string,
    @Body() body: { email?: string; senha?: string },
  ) {
    const data: Record<string, string> = {};
    if (body.email) data.email = body.email;
    if (body.senha) data.senhaHash = await bcrypt.hash(body.senha, 10);
    if (Object.keys(data).length === 0) return { message: 'Nada a atualizar' };
    return this.prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, tipo: true, dataCriacao: true },
    });
  }

  // DELETE /api/v1/usuarios/:id — Admin remove técnico
  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  async removerTecnico(@Param('id') id: string) {
    // Desvincula O.S. e Planos antes de deletar para evitar FK constraint
    await this.prisma.$transaction([
      this.prisma.ordemServico.updateMany({ where: { tecnicoId: id }, data: { tecnicoId: null } }),
      this.prisma.planoManutencao.updateMany({ where: { tecnicoId: id }, data: { tecnicoId: null } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);
    return { message: 'Técnico removido' };
  }
}
