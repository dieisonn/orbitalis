import { api } from '@/lib/api'
import type { Categoria, Conta } from '@/lib/financeiro'
import { ContasClient } from './contas-client'

export default async function ContasPage() {
  const [contas, categorias] = await Promise.all([
    api.get<Conta[]>('/financeiro/contas').catch(() => [] as Conta[]),
    api.get<Categoria[]>('/financeiro/categorias').catch(() => [] as Categoria[]),
  ])
  return <ContasClient contas={contas} categorias={categorias} />
}
