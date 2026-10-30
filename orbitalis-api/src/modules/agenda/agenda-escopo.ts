import { BadRequestException } from '@nestjs/common';

/** Em eventos de uma série: só este, este e os seguintes, ou todos. */
export type Escopo = 'este' | 'seguintes' | 'todos';

export function parseEscopo(v?: string): Escopo {
  if (v === undefined || v === '') return 'este';
  if (v === 'este' || v === 'seguintes' || v === 'todos') return v;
  throw new BadRequestException("escopo deve ser 'este', 'seguintes' ou 'todos'");
}
