'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function criarEquipamento(
  ambienteId: string,
  nome: string,
  marca: string,
  modelo: string,
  numeroSerie: string,
  tipoEquipamento: string,
) {
  await api.post('/equipamentos', {
    ambienteId,
    nome,
    marca,
    modelo: modelo || undefined,
    numeroSerie: numeroSerie || undefined,
    tipoEquipamento,
  })
  redirect('/equipamentos')
}
