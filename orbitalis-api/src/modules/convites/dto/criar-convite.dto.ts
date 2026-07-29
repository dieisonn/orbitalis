import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
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
}
