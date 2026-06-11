'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function deletarCliente(id: string) {
  await api.delete(`/clientes/${id}`)
}

export type ClienteExportRow = {
  razaoSocial: string
  nomeFantasia: string | null
  documento: string
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
  documento: string
  endereco: string
  telefone?: string
}

export type ImportResult = {
  razaoSocial: string
  documento: string
  status: 'ok' | 'erro'
  email?: string
  senhaTemporaria?: string
  mensagem?: string
}

export async function importarClientes(rows: ImportRow[]): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (const row of rows) {
    try {
      const result = await api.post<{ senhaTemporaria: string }>(
        '/clientes',
        {
          documento: row.documento.replace(/\D/g, ''),
          razaoSocial: row.razaoSocial,
          nomeFantasia: row.nomeFantasia || undefined,
          endereco: row.endereco,
          telefone: row.telefone || undefined,
        },
      )
      results.push({
        razaoSocial: row.razaoSocial,
        documento: row.documento,
        status: 'ok',
        email: `${row.documento.replace(/\D/g, '')}@portal.orbitalis`,
        senhaTemporaria: result.senhaTemporaria,
      })
    } catch (e) {
      results.push({
        razaoSocial: row.razaoSocial,
        documento: row.documento,
        status: 'erro',
        mensagem: e instanceof Error ? e.message : 'Erro desconhecido',
      })
    }
  }
  revalidatePath('/clientes')
  return results
}
