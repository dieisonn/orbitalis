'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function editarEquipamento(
  id: string,
  data: {
    nome: string
    marca: string
    modelo: string
    numeroSerie: string
    tipoEquipamento: string
    potencia: string
    dataInstalacao: string
    condicao: string
    diagnosticoInicial: string
    valorAquisicao: string
  },
) {
  await api.patch(`/equipamentos/${id}`, {
    nome: data.nome,
    marca: data.marca,
    modelo: data.modelo || null,
    numeroSerie: data.numeroSerie || null,
    tipoEquipamento: data.tipoEquipamento,
    potencia: data.potencia || null,
    dataInstalacao: data.dataInstalacao || null,
    condicao: data.condicao || null,
    diagnosticoInicial: data.diagnosticoInicial || null,
    valorAquisicao: data.valorAquisicao ? parseFloat(data.valorAquisicao) : null,
  })
  redirect('/equipamentos')
}
