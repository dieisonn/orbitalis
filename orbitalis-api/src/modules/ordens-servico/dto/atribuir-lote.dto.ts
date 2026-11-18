import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AtribuirTecnicoLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsUUID()
  tecnicoId!: string;

  // Opcional: nova data de agendamento para todas (AAAA-MM-DD). Sem data, cada O.S. mantém a sua.
  @IsOptional()
  @IsDateString()
  dataAgendamento?: string;
}
