import { OsOrigem, OsTipo } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateOrdemServicoDto {
  // Ambiente é opcional: sem ele, a O.S. usa o ambiente padrão "Sem local definido" do cliente
  @IsOptional()
  @IsUUID()
  ambienteId?: string;

  // Obrigatório quando não há ambienteId
  @ValidateIf((o: CreateOrdemServicoDto) => !o.ambienteId)
  @IsUUID()
  clienteId?: string;

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

  // true = quem programa decidiu que esta O.S. não leva checklist (ignora a sugestão automática)
  @IsOptional()
  @IsBoolean()
  semChecklist?: boolean;

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
