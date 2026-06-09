import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsuarioTipo } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // GET /api/v1/clientes/meu-perfil — Cliente autenticado vê seus próprios dados
  @Get('meu-perfil')
  @Roles(UsuarioTipo.cliente)
  meuPerfil(@CurrentUser() user: AuthUser) {
    return this.clientesService.meuPerfil(user.id);
  }

  // GET /api/v1/clientes/consulta-cnpj/:cnpj
  @Get('consulta-cnpj/:cnpj')
  @Roles(UsuarioTipo.admin)
  consultarCnpj(@Param('cnpj') cnpj: string) {
    return this.clientesService.consultarCnpj(cnpj);
  }

  // POST /api/v1/clientes
  @Post()
  @Roles(UsuarioTipo.admin)
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  // GET /api/v1/clientes
  @Get()
  @Roles(UsuarioTipo.admin)
  findAll() {
    return this.clientesService.findAll();
  }

  // GET /api/v1/clientes/:id
  @Get(':id')
  @Roles(UsuarioTipo.admin)
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  // PATCH /api/v1/clientes/:id
  @Patch(':id')
  @Roles(UsuarioTipo.admin)
  update(
    @Param('id') id: string,
    @Body() body: { razaoSocial?: string; nomeFantasia?: string; endereco?: string },
  ) {
    return this.clientesService.update(id, body);
  }

  // DELETE /api/v1/clientes/:id (soft delete §6.5)
  @Delete(':id')
  @Roles(UsuarioTipo.admin)
  remove(@Param('id') id: string) {
    return this.clientesService.remove(id);
  }
}
