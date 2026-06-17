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

  checklist: Record<string, unknown>;
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
