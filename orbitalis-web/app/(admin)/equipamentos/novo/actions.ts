'use server'

import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

type CreateEquipamentoData = {
  ambienteId: string
  nome: string
  marca: string
  modelo?: string
  numeroSerie?: string
  tipoEquipamento: string
  dataInstalacao?: string
  condicao?: string
  diagnosticoInicial?: string
  valorAquisicao?: number
}

export async function criarEquipamento(data: CreateEquipamentoData) {
  await api.post('/equipamentos', {
    ambienteId:          data.ambienteId,
    nome:                data.nome,
    marca:               data.marca,
    modelo:              data.modelo         || undefined,
    numeroSerie:         data.numeroSerie    || undefined,
    tipoEquipamento:     data.tipoEquipamento,
    dataInstalacao:      data.dataInstalacao || undefined,
    condicao:            data.condicao       || undefined,
    diagnosticoInicial:  data.diagnosticoInicial || undefined,
    valorAquisicao:      data.valorAquisicao ?? undefined,
  })
  redirect('/equipamentos')
}
