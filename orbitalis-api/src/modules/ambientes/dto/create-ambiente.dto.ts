import { IsDecimal, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAmbienteDto {
  @IsUUID()
  clienteId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsDecimal()
  metrosQuadrados: string;

  @IsString()
  @MaxLength(50)
  capacidadeTermica: string;

  @IsString()
  @MinLength(2)
  localizacaoInterna: string;
}
