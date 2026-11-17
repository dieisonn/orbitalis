import { Type } from 'class-transformer';
import { IsDefined, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class ChavesPushDto {
  @IsString() @MinLength(10) @MaxLength(200)
  p256dh: string;

  @IsString() @MinLength(8) @MaxLength(100)
  auth: string;
}

export class AssinarPushDto {
  @IsString() @MaxLength(600)
  endpoint: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChavesPushDto)
  keys: ChavesPushDto;
}

export class DesassinarPushDto {
  @IsString() @MaxLength(600)
  endpoint: string;
}
