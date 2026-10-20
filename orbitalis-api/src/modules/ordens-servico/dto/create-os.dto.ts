import { OsOrigem, OsTipo } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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
  tipoServicoId?: string;

  @IsOptional()
  @IsUUID()
  equipamentoId?: string;

  // Checklist escolhido; se omitido, o sistema sugere pelo tipo e pelo tipo de serviço
  @IsOptional()
  @IsUUID()
  modeloChecklistId?: string;

  @IsDateString()
  dataAgendamento: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio deve ser HH:MM' })
  horaInicio?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaFim deve ser HH:MM' })
  horaFim?: string;

  @IsOptional()
  @IsString()
  observacoesGerais?: string;
}
