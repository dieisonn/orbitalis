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
    })
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Erro ao salvar configuração' }
  }
}

export async function desconectarGoogle() {
  await api.delete('/configuracao/google')
  revalidatePath('/configuracoes')
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
