import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubstituirQrDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  novoCodigoQr: string;
}
