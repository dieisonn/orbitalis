import { OsOrigem } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrdemServicoDto {
  @IsUUID()
  ambienteId: string;

  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @IsEnum(OsOrigem)
  origem: OsOrigem;

  @IsDateString()
  dataAgendamento: string;

  @IsOptional()
  @IsString()
  observacoesGerais?: string;
}
