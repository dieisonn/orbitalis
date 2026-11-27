import { ListaLancamentos, type ParamsLista } from '../lista-lancamentos'

export default async function ReceberPage({ searchParams }: { searchParams: Promise<ParamsLista> }) {
  return <ListaLancamentos tipo="receber" sp={await searchParams} />
}
