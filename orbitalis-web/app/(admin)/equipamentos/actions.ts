'use server'
import { api } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function deletarEquipamento(id: string) {
  await api.delete(`/equipamentos/${id}`)
}

// ─── Export ───────────────────────────────────────────────────────────────────

export type EquipamentoExportRow = {
  ambienteId: string | null
  ambienteNome: string
  clienteNome: string
  nome: string
  tipoEquipamento: string
  potencia: string | null
  marca: string
  modelo: string | null
  numeroSerie: string | null
  dataInstalacao: string | null
  condicao: string | null
  valorAquisicao: number | null
  diagnosticoInicial: string | null
}

type ApiEquipamento = {
  id: string
  ambienteId: string | null
  nome: string
  tipoEquipamento: string
  potencia: string | null
  marca: string
  modelo: string | null
  numeroSerie: string | null
  dataInstalacao: string | null
  condicao: string | null
  valorAquisicao: number | null
  diagnosticoInicial: string | null
  ambiente: { nome: string; cliente: { razaoSocial: string; nomeFantasia: string | null } } | null
}

export async function exportarEquipamentosData(): Promise<EquipamentoExportRow[]> {
  const res = await api.get<{ data: ApiEquipamento[] }>('/equipamentos?perPage=9999')
  return res.data.map((e) => ({
    ambienteId:        e.ambienteId,
    ambienteNome:      e.ambiente?.nome ?? '',
    clienteNome:       e.ambiente?.cliente.nomeFantasia ?? e.ambiente?.cliente.razaoSocial ?? '',
    nome:              e.nome,
    tipoEquipamento:   e.tipoEquipamento,
    potencia:          e.potencia,
    marca:             e.marca,
    modelo:            e.modelo,
    numeroSerie:       e.numeroSerie,
    dataInstalacao:    e.dataInstalacao ? e.dataInstalacao.slice(0, 10) : null,
    condicao:          e.condicao,
    valorAquisicao:    e.valorAquisicao,
    diagnosticoInicial: e.diagnosticoInicial,
  }))
}

// ─── Import ───────────────────────────────────────────────────────────────────

export type EquipamentoImportRow = {
  nome: string
  tipoEquipamento: string
  potencia: string
  marca: string
  modelo?: string
  numeroSerie?: string
  ambienteId?: string
  ambienteNome?: string
  clienteNome?: string
  dataInstalacao?: string
  condicao?: string
  valorAquisicao?: number
  diagnosticoInicial?: string
}

export type EquipamentoImportResult = {
  nome: string
  marca: string
  status: 'ok' | 'erro'
  mensagem?: string
}

type AmbienteRef = {
  id: string
  nome: string
  cliente: { razaoSocial: string; nomeFantasia: string | null }
}

export async function importarEquipamentos(
  rows: EquipamentoImportRow[],
): Promise<EquipamentoImportResult[]> {
  let ambientes: AmbienteRef[] = []
  try {
    const res = await api.get<{ data: AmbienteRef[] }>('/ambientes?perPage=9999')
    ambientes = res.data
  } catch {
    return rows.map((r) => ({
      nome: r.nome,
      marca: r.marca,
      status: 'erro',
      mensagem: 'Falha ao buscar ambientes da API',
    }))
  }

  const results: EquipamentoImportResult[] = []
  for (const row of rows) {
    try {
      let ambienteId = row.ambienteId?.trim()

      if (!ambienteId) {
        const nameQ = row.ambienteNome?.toLowerCase().trim() ?? ''
        const clienteQ = row.clienteNome?.toLowerCase().trim() ?? ''
        let matches = ambientes.filter((a) => a.nome.toLowerCase().trim() === nameQ)
        if (matches.length === 0) {
          throw new Error(`Ambiente "${row.ambienteNome}" não encontrado`)
        }
        if (matches.length > 1 && clienteQ) {
          matches = matches.filter(
            (a) =>
              a.cliente.razaoSocial.toLowerCase().includes(clienteQ) ||
              (a.cliente.nomeFantasia ?? '').toLowerCase().includes(clienteQ),
          )
        }
        if (matches.length === 0) {
          throw new Error(
            `Ambiente "${row.ambienteNome}" não encontrado para cliente "${row.clienteNome}"`,
          )
        }
        if (matches.length > 1) {
          throw new Error(
            `Nome de ambiente ambíguo: "${row.ambienteNome}". Preencha a coluna cliente_nome.`,
          )
        }
        ambienteId = matches[0].id
      }

      await api.post('/equipamentos', {
        ambienteId,
        nome:               row.nome,
        tipoEquipamento:    row.tipoEquipamento,
        potencia:           row.potencia  || undefined,
        marca:              row.marca,
        modelo:             row.modelo    || undefined,
        numeroSerie:        row.numeroSerie || undefined,
        dataInstalacao:     row.dataInstalacao || undefined,
        condicao:           row.condicao?.toLowerCase() || undefined,
        valorAquisicao:     row.valorAquisicao ?? undefined,
        diagnosticoInicial: row.diagnosticoInicial || undefined,
      })
      results.push({ nome: row.nome, marca: row.marca, status: 'ok' })
    } catch (e) {
      results.push({
        nome:     row.nome,
        marca:    row.marca,
        status:   'erro',
        mensagem: e instanceof Error ? e.message : 'Erro desconhecido',
      })
    }
  }
  revalidatePath('/equipamentos')
  return results
}
