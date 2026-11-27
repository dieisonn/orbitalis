import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportarPlanilhaDto {
  // .xlsx em base64 (limite ~4 MB de arquivo)
  @IsString() @MaxLength(5_900_000) arquivoBase64: string;
  // true (padrão): só valida e mostra o resultado; false: grava
  @IsOptional() @IsBoolean() simular?: boolean;
}
