'use client'
import { Printer } from 'lucide-react'

type OrcItem = { id: string; descricao: string; quantidade: number; unidade: string; precoUnitario: number }
type Orc = {
  id: string; numero: number; status: string; titulo: string; validadeDias: number; observacoes: string | null
  criadoEm: string; aprovadoEm: string | null
  cliente: { razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string; telefone: string | null }
  criadoPor: { nome: string | null; email: string } | null
  itens: OrcItem[]
}
type Config = { nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null } | null

const STATUS_LABEL: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Proposta', aprovado: 'Aprovado', rejeitado: 'Rejeitado', expirado: 'Expirado' }

function fmtBRL(v: number) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

export function PrintOrcamento({ orc, config }: { orc: Orc; config?: Config }) {
  const numero = `ORC-${String(orc.numero).padStart(4, '0')}`
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const cor = config?.corPrimaria ?? '#0505ad'
  const total = orc.itens.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.precoUnitario), 0)
  const validade = new Date(new Date(orc.criadoEm).getTime() + orc.validadeDias * 86400000)

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 12mm 12mm 12mm; }
        @media print { .no-print { display: none !important; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { margin: 0; font-family: Arial, sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Barra de ações */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href=".." className="text-sm text-gray-600 hover:text-gray-900 font-medium">← Voltar</a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">{numero}</span>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg"
            style={{ backgroundColor: cor }}
          >
            <Printer size={14} /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', color: '#111', background: '#fff', maxWidth: '210mm', margin: '0 auto' }}>
        <div style={{ height: '5px', backgroundColor: cor, width: '100%' }} />

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0 12px 0', borderBottom: '1.5px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt={nomeEmpresa} style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 900, fontSize: '14pt', letterSpacing: '-0.5px' }}>{nomeEmpresa.toUpperCase()}</span>
            )}
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '12px', lineHeight: 1.5 }}>
              {config?.logoUrl && <p style={{ fontWeight: 700, fontSize: '10pt', margin: 0 }}>{nomeEmpresa}</p>}
              {config?.cnpj    && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.telefone}</p>}
              {config?.endereco && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.endereco}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', margin: '0 0 2px 0' }}>Proposta Comercial</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '18pt', margin: 0 }}>{numero}</p>
            <p style={{ fontSize: '7.5pt', color: '#666', margin: '2px 0 0 0' }}>{STATUS_LABEL[orc.status]}</p>
          </div>
        </div>

        {/* Cliente + datas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '14px 0', borderBottom: '1px solid #ddd' }}>
          <div>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 4px 0' }}>Cliente</p>
            <p style={{ fontWeight: 700, margin: 0 }}>{orc.cliente.razaoSocial}</p>
            {orc.cliente.nomeFantasia && <p style={{ color: '#555', margin: 0 }}>{orc.cliente.nomeFantasia}</p>}
            <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>{orc.cliente.documento}</p>
            <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>{orc.cliente.endereco}</p>
          </div>
          <div>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 4px 0' }}>Proposta</p>
            <p style={{ margin: '0 0 2px 0' }}><span style={{ color: '#666' }}>Título: </span>{orc.titulo}</p>
            <p style={{ margin: '0 0 2px 0' }}><span style={{ color: '#666' }}>Data: </span>{fmt(orc.criadoEm)}</p>
            <p style={{ margin: '0 0 2px 0' }}><span style={{ color: '#666' }}>Validade: </span>{fmt(validade.toISOString())}</p>
            {orc.criadoPor && <p style={{ margin: '0 0 2px 0' }}><span style={{ color: '#666' }}>Elaborado por: </span>{orc.criadoPor.nome ?? orc.criadoPor.email}</p>}
          </div>
        </div>

        {/* Tabela de itens */}
        <div style={{ padding: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1.5px solid #ccc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '7.5pt', color: '#555', fontWeight: 700 }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '7.5pt', color: '#555', fontWeight: 700 }}>Descrição</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '7.5pt', color: '#555', fontWeight: 700 }}>Qtd</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '7.5pt', color: '#555', fontWeight: 700 }}>Unit.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '7.5pt', color: '#555', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orc.itens.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '7px 8px', color: '#999', fontSize: '8pt' }}>{i + 1}</td>
                  <td style={{ padding: '7px 8px' }}>{item.descricao}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{item.quantidade} {item.unidade}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmtBRL(item.precoUnitario)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtBRL(Number(item.quantidade) * Number(item.precoUnitario))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #111', backgroundColor: '#fafafa' }}>
                <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>Total</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '12pt' }}>{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Observações */}
        {orc.observacoes && (
          <div style={{ padding: '10px 0', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>Observações</p>
            <p style={{ margin: 0, fontSize: '9pt', whiteSpace: 'pre-line' }}>{orc.observacoes}</p>
          </div>
        )}

        {/* Assinaturas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '24px', paddingTop: '16px', borderTop: '1.5px solid #111' }}>
          {[nomeEmpresa, orc.cliente.razaoSocial].map((label, i) => (
            <div key={i}>
              <div style={{ height: '48px', borderBottom: '1px solid #555', marginBottom: '4px' }} />
              <p style={{ fontSize: '8pt', textAlign: 'center', margin: '0 0 1px 0', color: '#444' }}>Assinatura</p>
              <p style={{ fontSize: '7.5pt', textAlign: 'center', margin: 0, color: '#888' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '14px', paddingTop: '6px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>{numero} · {nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}</p>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>{new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </>
  )
}
