import { SetMetadata } from '@nestjs/common';
import type { Modulo as ModuloKey } from '../modulos';

export const MODULO_KEY = 'modulos';
// Exige que o admin tenha acesso a pelo menos um dos módulos (admin com acesso total sempre passa)
export const Modulo = (...modulos: ModuloKey[]) => SetMetadata(MODULO_KEY, modulos);
