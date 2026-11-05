import { OsOrigem, OsTipo } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  Matches,
  ValidateIf,
  IsArray,
  ArrayMaxSize,
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

  // Demais tipos de serviço da O.S. (além do principal)
  // O.S. de vários dias: cada dia com data e horários (2 ou mais; a data/hora acima passam a ser as do 1º dia)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(62)
  dias?: { data: string; horaInicio?: string | null; horaFim?: string | null }[];

  // Endereço do cliente onde o serviço será feito (vazio = principal)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  enderecoId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID('all', { each: true })
  tiposServicoExtras?: string[];

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
