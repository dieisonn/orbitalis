import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const MOMENTOS_FOTO = ['antes', 'depois', 'problema', 'outra'] as const;

export class AdicionarFotoDto {
  @IsOptional() @IsUUID()
  itemId?: string;

  @IsOptional() @IsString() @MaxLength(60)
  checklistItemId?: string;

  @IsOptional() @IsIn(MOMENTOS_FOTO as unknown as string[])
  momento?: string;

  @IsOptional() @IsString() @MaxLength(200)
  legenda?: string;

  // data:image/...;base64,... (2 MB de imagem ≈ 2,8 milhões de caracteres)
  @IsString() @MaxLength(2_900_000)
  dados: string;
}

export class DefinirAuxiliaresDto {
  @IsArray() @ArrayMaxSize(20) @IsUUID('all', { each: true })
  tecnicoIds: string[];
}
