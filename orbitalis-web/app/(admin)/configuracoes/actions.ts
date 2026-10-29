'use server'
import { revalidatePath } from 'next/cache'
import { api } from '@/lib/api'

export async function salvarConfiguracao(
  nomeEmpresa: string,
  nomeFantasia: string,
  logoUrl: string,
  corPrimaria: string,
  cnpj: string,
  telefone: string,
  endereco: string,
  local?: { cidade: string; uf: string; codigoIbge: string },   // só enviado quando a pessoa alterou a localização
  contato?: { email: string; site: string; instrucoesOs: string; agrupamentoOsPadrao?: string },   // vazio limpa o campo
) {
  try {
    await api.patch('/configuracao', {
      nomeEmpresa,
      nomeFantasia: nomeFantasia || undefined,
      logoUrl: logoUrl || undefined,
      corPrimaria: corPrimaria || undefined,
      cnpj: cnpj || undefined,
      telefone: telefone || undefined,
      endereco: endereco || undefined,
      ...(local ? { cidade: local.cidade, uf: local.uf, codigoIbge: local.codigoIbge } : {}),
      ...(contato ? { email: contato.email, site: contato.site, instrucoesOs: contato.instrucoesOs, ...(contato.agrupamentoOsPadrao ? { agrupamentoOsPadrao: contato.agrupamentoOsPadrao } : {}) } : {}),
    })
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao salvar configuração' }
  }
}

export async function salvarResponsavelTecnico(responsavelTecnicoId: string | null) {
  try {
    await api.patch('/configuracao', { responsavelTecnicoId: responsavelTecnicoId || null })
    revalidatePath('/configuracoes')
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao salvar' }
  }
}

export async function salvarThresholdsConfiabilidade(
  mttrLimiteHoras: number | null,
  mtbfLimiteDias: number | null,
  custoHoraParada: number | null = null,
) {
  try {
    await api.patch('/configuracao', {
      mttrLimiteHoras: mttrLimiteHoras ?? null,
      mtbfLimiteDias: mtbfLimiteDias ?? null,
      custoHoraParada: custoHoraParada ?? null,
    })
    revalidatePath('/configuracoes')
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao salvar' }
  }
}
