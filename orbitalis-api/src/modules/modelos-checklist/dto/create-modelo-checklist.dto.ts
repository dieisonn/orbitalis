import { IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class ChecklistItemDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(300)
  descricao: string;

  obrigatorio: boolean;
}

export class CreateModeloChecklistDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nome: string;

  @IsArray()
  itens: ChecklistItemDto[];
}
