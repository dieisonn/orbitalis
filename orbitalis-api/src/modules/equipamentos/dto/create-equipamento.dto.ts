import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateEquipamentoDto {
  @IsUUID()
  ambienteId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsString()
  @MaxLength(100)
  marca: string;

  @IsString()
  @MaxLength(100)
  modelo: string;

  @IsString()
  @MaxLength(100)
  numeroSerie: string;

  @IsString()
  @MaxLength(100)
  tipoEquipamento: string;
}
