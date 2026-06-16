import { OsOrigem, OsTipo } from '@prisma/client';
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

  @IsOptional()
  @IsEnum(OsTipo)
  tipo?: OsTipo;

  @IsOptional()
  @IsUUID()
  equipamentoId?: string;

  @IsDateString()
  dataAgendamento: string;

  @IsOptional()
  @IsString()
  observacoesGerais?: string;
}
