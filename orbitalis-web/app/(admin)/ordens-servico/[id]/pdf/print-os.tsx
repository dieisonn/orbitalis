'use client'

import { Printer } from 'lucide-react'

type Item = {
  id: string
  statusItem: string
  observacoesTecnicas: string | null
  equipamento: {
    nome: string
    marca: string
    modelo: string | null
    tipoEquipamento: string
    codigoQr: string
  }
}

type OS = {
  id: string
  status: string
  origem: string
  dataAgendamento: string
  dataInicio: string | null
  dataConclusao: string | null
  observacoesGerais: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    capacidadeTermica: string
    cliente: {
      razaoSocial: string
      nomeFantasia: string | null
      documento: string
      endereco: string
    }
  }
  tecnico: { email: string } | null
  itens: Item[]
}

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  agendada: 'Agendada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual (Admin)',
  preventiva_automatica: 'Preventiva Automática',
  portal_cliente: 'Portal Cliente',
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  nao_aplicavel: 'N/A',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export function PrintOS({ os }: { os: OS }) {
  return (
    <>
      <style>{`
        @page { size: A4; margin: 20mm 15mm; }
        @media print { .no-print { display: none !important; } body { font-size: 11pt; } }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <a
          href="/ordens-servico"
          className="px-4 py-2 border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          ← Voltar
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-semibold rounded-lg hover:bg-action/90 transition-colors"
        >
          <Printer size={14} />
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-8 bg-white text-gray-900 font-sans print:p-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">ORBITALIS</h1>
            <p className="text-xs text-gray-500">Sistema de Gestão de Climatização</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ordem de Serviço</p>
            <p className="text-sm font-mono font-bold text-gray-800">{os.id.slice(0, 8).toUpperCase()}</p>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${
              os.status === 'concluida' ? 'bg-green-100 text-green-800' :
              os.status === 'cancelada' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {STATUS_LABEL[os.status] ?? os.status}
            </span>
          </div>
        </div>

        {/* Informações principais */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cliente</p>
            <p className="font-semibold">{os.ambiente.cliente.razaoSocial}</p>
            {os.ambiente.cliente.nomeFantasia && (
              <p className="text-sm text-gray-500">{os.ambiente.cliente.nomeFantasia}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{os.ambiente.cliente.documento}</p>
            <p className="text-xs text-gray-500">{os.ambiente.cliente.endereco}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ambiente</p>
            <p className="font-semibold">{os.ambiente.nome}</p>
            <p className="text-xs text-gray-500">{os.ambiente.localizacaoInterna}</p>
            <p className="text-xs text-gray-500">Cap. Térmica: {os.ambiente.capacidadeTermica}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Técnico</p>
            <p className="font-medium">{os.tecnico?.email ?? 'Não atribuído'}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Datas</p>
            <p className="text-sm">Agendamento: <span className="font-medium">{fmt(os.dataAgendamento)}</span></p>
            {os.dataInicio && <p className="text-sm">Início: <span className="font-medium">{fmt(os.dataInicio)}</span></p>}
            {os.dataConclusao && <p className="text-sm">Conclusão: <span className="font-medium">{fmt(os.dataConclusao)}</span></p>}
            <p className="text-xs text-gray-400 mt-1">Origem: {ORIGEM_LABEL[os.origem] ?? os.origem}</p>
          </div>
        </div>

        {/* Observações gerais */}
        {os.observacoesGerais && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Observações Gerais</p>
            <p className="text-sm">{os.observacoesGerais}</p>
          </div>
        )}

        {/* Equipamentos */}
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Equipamentos ({os.itens.length})
          </p>

          <div className="space-y-4">
            {os.itens.map((item, idx) => (
              <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">{idx + 1}.</span>
                    <span className="font-semibold text-sm">{item.equipamento.nome}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {item.equipamento.marca}
                      {item.equipamento.modelo ? ` ${item.equipamento.modelo}` : ''}
                      {' · '}{item.equipamento.tipoEquipamento}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    item.statusItem === 'concluido' ? 'bg-green-100 text-green-800' :
                    item.statusItem === 'nao_aplicavel' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ITEM_STATUS_LABEL[item.statusItem] ?? item.statusItem}
                  </span>
                </div>
                <div className="px-4 py-3">
                  {item.observacoesTecnicas ? (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-400">Obs. técnicas: </span>
                      {item.observacoesTecnicas}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Sem observações técnicas</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assinatura */}
        <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-200">
          <div>
            <div className="border-b border-gray-400 mb-1 h-10" />
            <p className="text-xs text-gray-500 text-center">Assinatura do Técnico</p>
            <p className="text-xs text-gray-400 text-center">{os.tecnico?.email ?? ''}</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-1 h-10" />
            <p className="text-xs text-gray-500 text-center">Assinatura do Responsável</p>
            <p className="text-xs text-gray-400 text-center">{os.ambiente.cliente.razaoSocial}</p>
          </div>
        </div>

        <p className="text-[9px] text-gray-300 text-center mt-8">
          Documento gerado pelo Orbitalis CMMS · {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </>
  )
}
