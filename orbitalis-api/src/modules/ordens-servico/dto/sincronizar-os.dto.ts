import { OsItemStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
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
  @MaxLength(5000)
  observacoesTecnicas?: string;

  // Checklist do item com o que foi marcado em campo (lista de itens do snapshot)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(300)
  checklist?: Record<string, unknown>[];
}

export class SincronizarOsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ItemSincronizadoDto)
  itens: ItemSincronizadoDto[];

  // Imagem PNG/JPEG em data URL (até ~1,5 MB)
  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  @Matches(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, { message: 'assinaturaBase64 deve ser uma imagem PNG ou JPEG' })
  assinaturaBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observacoesGerais?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recebidoPor?: string;

  // Observação geral do técnico sobre a O.S.; o autor e o horário são gravados pelo servidor
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observacoesTecnico?: string;

  // Só vale para O.S. sem equipamento (visita): sem itens não há o que marcar como concluído
  @IsOptional()
  @IsBoolean()
  concluir?: boolean;

  // Entrada e saída no cliente, informadas pelo técnico (ISO 8601); vazio = horário do envio
  @IsOptional()
  @IsDateString()
  entrada?: string;

  @IsOptional()
  @IsDateString()
  saida?: string;
}
