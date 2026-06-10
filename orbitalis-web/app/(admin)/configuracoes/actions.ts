'use server'
import { api } from '@/lib/api'

export async function salvarConfiguracao(
  nomeEmpresa: string,
  nomeFantasia: string,
  logoUrl: string,
  corPrimaria: string,
) {
  await api.patch('/configuracao', {
    nomeEmpresa,
    nomeFantasia: nomeFantasia || undefined,
    logoUrl: logoUrl || undefined,
    corPrimaria: corPrimaria || undefined,
  })
}
