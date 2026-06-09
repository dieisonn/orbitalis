'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarAmbiente(
  id: string,
  data: { nome: string; metrosQuadrados: string; capacidadeTermica: string; localizacaoInterna: string },
) {
  await api.patch(`/ambientes/${id}`, {
    nome: data.nome,
    metrosQuadrados: Number(data.metrosQuadrados),
    capacidadeTermica: data.capacidadeTermica,
    localizacaoInterna: data.localizacaoInterna,
  })
  redirect('/ambientes')
}
