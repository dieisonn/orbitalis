import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConviteTipo } from '@prisma/client';

export class CriarConviteDto {
  @IsEnum(ConviteTipo)
  tipo: ConviteTipo;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  // Convite de usuário do escritório (tipo admin): perfil e módulos liberados
  @IsOptional()
  @IsString()
  perfilAcesso?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissoes?: string[];
}
