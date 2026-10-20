'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function deletarCliente(id: string): Promise<{ error: string } | void> {
  try {
    await api.delete(`/clientes/${id}`)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir cliente' }
  }
}

export type ClienteExportRow = {
  razaoSocial: string
  nomeFantasia: string | null
  documento: string | null
  endereco: string
  telefone: string | null
}

export async function exportarClientesData(): Promise<ClienteExportRow[]> {
  const res = await api.get<{ data: ClienteExportRow[] }>('/clientes?perPage=9999')
  return res.data
}

export type ImportRow = {
  razaoSocial: string
  nomeFantasia?: string
  documento?: string
  endereco?: string
  telefone?: string
  celular?: string
  email?: string
  cidade?: string
  uf?: string
}

export type ResultadoLinha = {
  linha: number
  nome: string
  status: 'criado' | 'ignorado' | 'erro'
  mensagem?: string
}

// Envia um lote (até 500 clientes) para a API; a tela chama em pedaços para mostrar o andamento.
export async function importarLote(
  clientes: ImportRow[],
): Promise<{ resultados: ResultadoLinha[] } | { error: string }> {
  try {
    const res = await api.post<{ resultados: ResultadoLinha[] }>('/clientes/importar', { clientes })
    revalidatePath('/clientes')
    return { resultados: res.resultados }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}
