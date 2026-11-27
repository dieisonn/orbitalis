import Link from 'next/link'
import { EtiquetasClient } from './etiquetas-client'

export default function EtiquetasPage() {
  return (
    <div>
      <div className="mb-6 print:hidden">
        <Link href="/produtos" className="text-sm text-primary hover:underline">← Produtos</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Etiquetas de produtos</h1>
        <p className="text-gray-500 text-sm mt-1">Escolha o formato da folha ou do rolo, confira a prévia e imprima.</p>
      </div>
      <EtiquetasClient />
    </div>
  )
}
