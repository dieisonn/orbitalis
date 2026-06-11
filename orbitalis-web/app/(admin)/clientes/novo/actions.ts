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
  senhaTemporaria: string
  email: string
}

export async function criarCliente(
  documento: string,
  razaoSocial: string,
  nomeFantasia: string,
  endereco: string,
  telefone?: string,
): Promise<CriarClienteResult> {
  const result = await api.post<{ cliente: { documento: string }; senhaTemporaria: string }>(
    '/clientes',
    {
      documento: documento.replace(/\D/g, ''),
      razaoSocial,
      nomeFantasia: nomeFantasia || undefined,
      endereco,
      telefone: telefone || undefined,
    },
  )
  return {
    senhaTemporaria: result.senhaTemporaria,
    email: `${documento.replace(/\D/g, '')}@portal.orbitalis`,
  }
}
