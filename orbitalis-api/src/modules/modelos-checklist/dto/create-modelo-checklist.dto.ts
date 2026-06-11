import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum TipoItemChecklist {
  texto         = 'texto',
  numero        = 'numero',
  escolha_unica = 'escolha_unica',
  multipla_escolha = 'multipla_escolha',
}

export class ChecklistItemDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(300)
  descricao: string;

  obrigatorio: boolean;

  @IsOptional()
  @IsEnum(TipoItemChecklist)
  tipo?: TipoItemChecklist;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidade?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opcoes?: string[];
}

export class CreateModeloChecklistDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nome: string;

  @IsArray()
  itens: ChecklistItemDto[];
}
