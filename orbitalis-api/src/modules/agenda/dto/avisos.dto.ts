import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt } from 'class-validator';

export const MINUTOS_AVISO = [10, 20, 30, 40, 50] as const;

export class AvisosAgendaDto {
  // Até 3 avisos, escolhidos entre 10/20/30/40/50 minutos; lista vazia = sem avisos
  @IsArray()
  @ArrayMaxSize(3, { message: 'No máximo 3 avisos' })
  @ArrayUnique()
  @IsInt({ each: true })
  @IsIn(MINUTOS_AVISO as unknown as number[], { each: true, message: 'Use 10, 20, 30, 40 ou 50 minutos' })
  minutos!: number[];
}
