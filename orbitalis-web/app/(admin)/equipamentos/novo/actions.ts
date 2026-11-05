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
  potencia?: string
  dataInstalacao?: string
  condicao?: string
  diagnosticoInicial?: string
  valorAquisicao?: number
  planoIds?: string[]
}

// continuar = true: fica no formulário para cadastrar o próximo equipamento do mesmo ambiente
export async function criarEquipamento(data: CreateEquipamentoData, continuar = false) {
  await api.post('/equipamentos', {
    ambienteId:          data.ambienteId,
    nome:                data.nome,
    marca:               data.marca,
    modelo:              data.modelo         || undefined,
    numeroSerie:         data.numeroSerie    || undefined,
    tipoEquipamento:     data.tipoEquipamento,
    potencia:            data.potencia        || undefined,
    dataInstalacao:      data.dataInstalacao  || undefined,
    condicao:            data.condicao       || undefined,
    diagnosticoInicial:  data.diagnosticoInicial || undefined,
    valorAquisicao:      data.valorAquisicao ?? undefined,
    planoIds:            data.planoIds?.length ? data.planoIds : undefined,
  })
  if (!continuar) redirect('/equipamentos')
}

export type PlanoElegivel = {
  id: string
  frequenciaDias: number
  proximaGeracao: string
  dataFim: string | null
  tipoServico: { sigla: string; nome: string } | null
  contrato: { descricao: string | null } | null
  _count: { ordensServico: number }
}

// Planos preventivos do cliente do ambiente que podem receber o equipamento novo
export async function planosElegiveis(ambienteId: string): Promise<PlanoElegivel[]> {
  try {
    return await api.get<PlanoElegivel[]>(`/equipamentos/planos-elegiveis/${ambienteId}`)
  } catch {
    return []
  }
}
