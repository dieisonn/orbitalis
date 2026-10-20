'use server'

import { api } from '@/lib/api'

type CnpjWsEstabelecimento = {
  nome_fantasia?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cep?: string
  cidade?: { nome: string }
  estado?: { sigla: string }
}

type CnpjWsResponse = {
  razao_social?: string
  estabelecimento?: CnpjWsEstabelecimento
}

export type CnpjPrefill = {
  razaoSocial: string
  nomeFantasia: string
  endereco: string
}

export async function consultarCnpj(cnpj: string): Promise<CnpjPrefill> {
  const raw = await api.get<CnpjWsResponse>(`/clientes/consulta-cnpj/${cnpj.replace(/\D/g, '')}`)
  const est = raw.estabelecimento ?? {}
  const partes = [
    est.logradouro,
    est.numero,
    est.bairro,
    est.cidade?.nome,
    est.estado?.sigla,
  ].filter(Boolean)

  return {
    razaoSocial: raw.razao_social ?? '',
    nomeFantasia: est.nome_fantasia ?? '',
    endereco: partes.join(', '),
  }
}

export type CriarClienteResult = {
  clienteId: string
}

// O cliente é criado sem login. O acesso ao portal é dado depois, por convite.
export type DadosNovoCliente = {
  documento?: string
  razaoSocial: string
  nomeFantasia?: string
  endereco: string
  telefone?: string
  celular?: string
  email?: string
  cidade?: string
  uf?: string
}

export async function criarCliente(d: DadosNovoCliente): Promise<CriarClienteResult> {
  const vazio = (v?: string) => (v && v.trim() ? v.trim() : undefined)
  const result = await api.post<{ cliente: { id: string } }>('/clientes', {
    documento: vazio(d.documento?.replace(/\D/g, '')),
    razaoSocial: d.razaoSocial,
    nomeFantasia: vazio(d.nomeFantasia),
    endereco: d.endereco,
    telefone: vazio(d.telefone),
    celular: vazio(d.celular),
    email: vazio(d.email),
    cidade: vazio(d.cidade),
    uf: vazio(d.uf),
  })
  return { clienteId: result.cliente.id }
}
