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
    numOsIncluidas: formData.get('numOsIncluidas') ? parseInt(formData.get('numOsIncluidas') as string) : undefined,
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
