'use server'

import { api } from '@/lib/api'

export type ClienteCriado = { id: string; razaoSocial: string; nomeFantasia: string | null; endereco: string; telefone: string | null }
export type AmbienteCriado = { id: string; nome: string; localizacaoInterna: string; clienteId: string }

/**
 * Cadastro rápido durante outra tarefa (criar O.S., criar evento): só o essencial do cliente e,
 * se pedido, um primeiro ambiente — o resto se completa depois na tela de Clientes/Ambientes.
 */
export async function criarClienteRapido(
  d: { razaoSocial: string; documento?: string; telefone?: string; endereco: string },
  ambiente?: { nome: string; localizacaoInterna: string },
): Promise<{ cliente: ClienteCriado; ambiente: AmbienteCriado | null }> {
  const vazio = (v?: string) => (v && v.trim() ? v.trim() : undefined)
  const res = await api.post<{ cliente: { id: string } }>('/clientes', {
    razaoSocial: d.razaoSocial.trim(),
    documento: vazio(d.documento?.replace(/\D/g, '')),
    telefone: vazio(d.telefone),
    endereco: d.endereco.trim(),
  })
  const cliente: ClienteCriado = {
    id: res.cliente.id, razaoSocial: d.razaoSocial.trim(), nomeFantasia: null,
    endereco: d.endereco.trim(), telefone: vazio(d.telefone) ?? null,
  }
  if (!ambiente) return { cliente, ambiente: null }

  const nome = ambiente.nome.trim() || 'Principal'
  const localizacaoInterna = ambiente.localizacaoInterna.trim() || d.endereco.trim()
  const amb = await api.post<{ id: string }>('/ambientes', {
    clienteId: cliente.id, nome, localizacaoInterna,
    metrosQuadrados: '0', capacidadeTermica: 'A definir',   // completar depois em Ambientes
  })
  return { cliente, ambiente: { id: amb.id, nome, localizacaoInterna, clienteId: cliente.id } }
}

/** Cadastro rápido de um ambiente para um cliente já existente (sem sair da tela de O.S.). */
export async function criarAmbienteRapido(
  clienteId: string,
  d: { nome: string; localizacaoInterna: string },
): Promise<AmbienteCriado> {
  const nome = d.nome.trim() || 'Principal'
  const localizacaoInterna = d.localizacaoInterna.trim() || nome
  const amb = await api.post<{ id: string }>('/ambientes', {
    clienteId, nome, localizacaoInterna,
    metrosQuadrados: '0', capacidadeTermica: 'A definir',   // completar depois em Ambientes
  })
  return { id: amb.id, nome, localizacaoInterna, clienteId }
}
