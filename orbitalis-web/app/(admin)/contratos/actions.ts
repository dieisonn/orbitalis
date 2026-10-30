'use server'
import { api } from '@/lib/api'
import { redirect } from 'next/navigation'

export async function criarContrato(formData: FormData) {
  const data = {
    clienteId:      formData.get('clienteId') as string,
    descricao:      formData.get('descricao') as string,
    valorMensal:    formData.get('valorMensal') ? parseFloat(formData.get('valorMensal') as string) : undefined,
    vigenciaInicio: formData.get('vigenciaInicio') as string,
    vigenciaFim:    formData.get('vigenciaFim') as string,
    observacoes:    (formData.get('observacoes') as string) || undefined,
  }
  await api.post('/contratos', data)
  redirect('/contratos')
}

export async function atualizarContrato(id: string, data: Record<string, unknown>) {
  try {
    await api.patch(`/contratos/${id}`, data)
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro' }
  }
}

export async function excluirContrato(id: string) {
  try {
    await api.delete(`/contratos/${id}`)
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro' }
  }
}

export type RenovacaoPreview = {
  jaRenovado: boolean
  contrato: { id: string; descricao: string; valorMensal: number | string | null; numOsIncluidas: number | null; observacoes: string | null; vigenciaInicio: string; vigenciaFim: string; cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } }
  sugestao: { vigenciaInicio: string; vigenciaFim: string }
  planos: { id: string; frequenciaDias: number; visitasPrevistas: number | null; tipoServico: { sigla: string; nome: string } | null; equipamentos: { id: string; nome: string; tipoEquipamento: string; ambiente: string }[] }[]
  outrosEquipamentos: { id: string; nome: string; tipoEquipamento: string; ambiente: string }[]
}

export async function carregarRenovacao(id: string) {
  try {
    return { ok: true as const, dados: await api.get<RenovacaoPreview>(`/contratos/${id}/renovacao`) }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao carregar' }
  }
}

export async function renovarContrato(id: string, body: {
  descricao: string; valorMensal: number | null; numOsIncluidas: number | null; observacoes: string | null
  vigenciaInicio: string; vigenciaFim: string
  planos: { planoId: string; equipamentoIds: string[]; visitasPrevistas?: number }[]
}) {
  try {
    const r = await api.post<{ id: string; planosCriados: number }>(`/contratos/${id}/renovar`, body)
    return { ok: true as const, ...r }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao renovar' }
  }
}
