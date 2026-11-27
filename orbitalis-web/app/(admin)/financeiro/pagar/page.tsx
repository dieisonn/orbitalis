import { ListaLancamentos, type ParamsLista } from '../lista-lancamentos'

export default async function PagarPage({ searchParams }: { searchParams: Promise<ParamsLista> }) {
  return <ListaLancamentos tipo="pagar" sp={await searchParams} />
}
