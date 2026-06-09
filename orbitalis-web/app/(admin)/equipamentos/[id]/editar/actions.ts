'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarEquipamento(
  id: string,
  data: { nome: string; marca: string; modelo: string; numeroSerie: string; tipoEquipamento: string },
) {
  await api.patch(`/equipamentos/${id}`, {
    nome: data.nome,
    marca: data.marca,
    modelo: data.modelo || null,
    numeroSerie: data.numeroSerie || null,
    tipoEquipamento: data.tipoEquipamento,
  })
  redirect('/equipamentos')
}
