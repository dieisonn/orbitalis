import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class TransferirDto {
  @IsUUID()
  paraUserId!: string;

  // 'pendentes' (padrão): abertas, agendadas e em andamento. 'todas': inclui concluídas e canceladas.
  @IsOptional()
  @IsIn(['pendentes', 'todas'])
  escopo?: 'pendentes' | 'todas';

  // Período (data de agendamento da O.S.), AAAA-MM-DD, inclusive. Sem período = sem limite de data.
  @IsOptional()
  @IsDateString()
  de?: string;

  @IsOptional()
  @IsDateString()
  ate?: string;
}

export class FiltroTransferenciaDto {
  @IsOptional()
  @IsIn(['pendentes', 'todas'])
  escopo?: 'pendentes' | 'todas';

  @IsOptional()
  @IsDateString()
  de?: string;

  @IsOptional()
  @IsDateString()
  ate?: string;
}
