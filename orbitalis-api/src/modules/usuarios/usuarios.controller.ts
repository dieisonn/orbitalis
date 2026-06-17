import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('tecnicos/produtividade')
  @Roles(UsuarioTipo.admin)
  async produtividade(@Query('mes') mesQ?: string, @Query('ano') anoQ?: string) {
    const agora = new Date();
    const mes = mesQ ? parseInt(mesQ) : agora.getMonth() + 1;
    const ano = anoQ ? parseInt(anoQ) : agora.getFullYear();
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59, 999);

    const tecnicos = await this.prisma.usuario.findMany({
      where: { tipo: 'tecnico' },
      select: {
        id: true, email: true, nome: true, especialidade: true,
        ordensComoTecnico: {
          where: { dataAgendamento: { gte: inicio, lte: fim } },
          select: {
            id: true, status: true, tipo: true,
            dataAgendamento: true, dataConclusao: true, dataInicio: true,
          },
        },
      },
    });

    return tecnicos.map((t) => {
      const os = t.ordensComoTecnico;
      const concluidas = os.filter((o) => o.status === 'concluida');
      const atrasadas  = os.filter((o) => ['aberta', 'agendada'].includes(o.status) && o.dataAgendamento < agora);
      const corretivas = os.filter((o) => o.tipo === 'corretiva');

      const tempos = concluidas
        .filter((o) => o.dataConclusao)
        .map((o) => (o.dataConclusao!.getTime() - o.dataAgendamento.getTime()) / 86_400_000);
      const tempoMedio = tempos.length > 0 ? +(tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : null;

      return {
        id: t.id,
        nome: t.nome ?? t.email,
        email: t.email,
        especialidade: t.especialidade,
        totalOs: os.length,
        concluidas: concluidas.length,
        atrasadas: atrasadas.length,
        emAberto: os.filter((o) => !['concluida', 'cancelada'].includes(o.status)).length,
        taxaConclusao: os.length > 0 ? Math.round((concluidas.length / os.length) * 100) : 0,
        tempoMedioAtendimentoDias: tempoMedio,
        corretivasMes: corretivas.length,
      };
    }).sort((a, b) => b.concluidas - a.concluidas);
  }

  @Get('tecnicos')
  @Roles(UsuarioTipo.admin)
  async findTecnicos(@Query('page') page?: string, @Query('perPage') perPage?: string) {
    const p = Number(page) || 1;
    const pp = Number(perPage) || 20;
    const skip = (p - 1) * pp;
    const where = { tipo: 'tecnico' as const };
    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({ where, select: SELECT_TECNICO, orderBy: { nome: 'asc' }, skip, take: pp }),
      this.prisma.usuario.count({ where }),
    ]);
    return { data, total, page: p, perPage: pp };
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
