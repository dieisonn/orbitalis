import { IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateDiagnosticoDto {
  @IsUUID()
  equipamentoId: string

  @IsOptional()
  @IsUUID()
  osId?: string

  @IsOptional()
  @IsString()
  arquivoIduNome?: string

  @IsOptional()
  @IsString()
  arquivoOduNome?: string

  @IsOptional()
  @IsString()
  dataInspecao?: string

  @IsOptional()
  @IsString()
  iduCsv?: string

  @IsOptional()
  @IsString()
  oduCsv?: string
}
