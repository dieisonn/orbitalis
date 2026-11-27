import { FinanceiroAbas } from './abas'

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Fluxo de caixa, contas a receber e a pagar, ligados aos orçamentos e ao estoque.</p>
      </div>
      <FinanceiroAbas />
      {children}
    </div>
  )
}
