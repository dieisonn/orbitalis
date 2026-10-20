import { OsItemStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemSincronizadoDto {
  @IsUUID()
  itemId: string;

  @IsEnum(OsItemStatus)
  statusItem: OsItemStatus;

  @IsOptional()
  @IsString()
  observacoesTecnicas?: string;

  // Checklist do item com o que foi marcado em campo (lista de itens do snapshot)
  @IsOptional()
  @IsArray()
  checklist?: Record<string, unknown>[];
}

export class SincronizarOsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSincronizadoDto)
  itens: ItemSincronizadoDto[];

  @IsOptional()
  @IsString()
  assinaturaBase64?: string;

  @IsOptional()
  @IsString()
  observacoesGerais?: string;
}
