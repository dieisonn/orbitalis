import { IsDateString, IsUUID } from 'class-validator'

export class TriarOsDto {
  @IsUUID()
  tecnicoId: string

  @IsDateString()
  dataAgendamento: string
}
