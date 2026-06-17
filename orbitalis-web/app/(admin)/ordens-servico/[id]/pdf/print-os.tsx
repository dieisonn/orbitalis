'use client'

import { Printer } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean }

type Item = {
  id: string
  statusItem: string
  observacoesTecnicas: string | null
  checklistSnapshot: ChecklistItem[] | null
  equipamento: {
    nome: string; marca: string; modelo: string | null
    tipoEquipamento: string; codigoQr: string; numeroSerie: string | null
  }
}

type OS = {
  id: string; numero: number | null; status: string; origem: string
  dataAgendamento: string; dataInicio: string | null; dataConclusao: string | null
  observacoesGerais: string | null
  assinaturaBase64: string | null
  tipoGas: string | null
  quantidadeGasGramas: number | null
  ambiente: {
    nome: string; localizacaoInterna: string; capacidadeTermica: string
    cliente: { razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string }
  }
  tecnico: { email: string; nome: string | null } | null
  itens: Item[]
}

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
} | null

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente: 'Portal Cliente',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function parseSnapshot(snapshot: unknown): ChecklistItem[] {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) return snapshot as ChecklistItem[]
  try {
    const parsed = JSON.parse(String(snapshot))
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function PrintOS({ os, config }: { os: OS; config?: Config }) {
  const numero = os.numero != null
    ? `OS-${String(os.numero).padStart(4, '0')}`
    : `OS-${os.id.slice(0, 6).toUpperCase()}`
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const logoUrl = config?.logoUrl ?? null
  const cor = config?.corPrimaria ?? '#0505ad'
  const tecnicoLabel = os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : 'Não atribuído'

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 12mm 12mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        body { margin: 0; font-family: 'Arial', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Barra de ações — apenas na tela */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href=".." className="text-sm text-gray-600 hover:text-gray-900 font-medium">← Voltar</a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">{numero}</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg"
            style={{ backgroundColor: cor }}
          >
            <Printer size={14} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      {/* ── DOCUMENTO ── */}
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', color: '#111', background: '#fff', maxWidth: '210mm', margin: '0 auto' }}>

        {/* Faixa de cor no topo — identidade da empresa */}
        <div style={{ height: '5px', backgroundColor: cor, width: '100%' }} />

        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0 12px 0', borderBottom: '1.5px solid #111' }}>
          {/* Empresa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={nomeEmpresa}
                style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 900, fontSize: '14pt', letterSpacing: '-0.5px' }}>{nomeEmpresa.toUpperCase()}</span>
            )}
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '12px', lineHeight: 1.5 }}>
              {logoUrl && <p style={{ fontWeight: 700, fontSize: '10pt', margin: 0 }}>{nomeEmpresa}</p>}
              {config?.cnpj    && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.telefone}</p>}
              {config?.endereco && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.endereco}</p>}
            </div>
          </div>

          {/* Número da O.S. */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', margin: '0 0 2px 0' }}>Ordem de Serviço</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '20pt', margin: 0, color: '#111' }}>{numero}</p>
            <p style={{ fontSize: '7.5pt', color: '#666', margin: '2px 0 0 0' }}>{ORIGEM_LABEL[os.origem] ?? os.origem}</p>
          </div>
        </div>

        {/* INFORMAÇÕES PRINCIPAIS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '14px 0', borderBottom: '1px solid #ddd' }}>
          <Cell label="Cliente">
            <strong>{os.ambiente.cliente.razaoSocial}</strong>
            {os.ambiente.cliente.nomeFantasia && (
              <><br /><span style={{ color: '#555' }}>{os.ambiente.cliente.nomeFantasia}</span></>
            )}
            <br />
            <span style={{ color: '#888', fontSize: '8pt' }}>{os.ambiente.cliente.documento}</span>
            <br />
            <span style={{ color: '#888', fontSize: '8pt' }}>{os.ambiente.cliente.endereco}</span>
          </Cell>

          <Cell label="Ambiente / Local">
            <strong>{os.ambiente.nome}</strong>
            <br />
            <span style={{ color: '#555' }}>{os.ambiente.localizacaoInterna}</span>
            <br />
            <span style={{ color: '#888', fontSize: '8pt' }}>Cap. Térmica: {os.ambiente.capacidadeTermica}</span>
          </Cell>

          <Cell label="Técnico Responsável">
            <strong>{tecnicoLabel}</strong>
            {os.tecnico?.nome && (
              <><br /><span style={{ color: '#888', fontSize: '8pt' }}>{os.tecnico.email}</span></>
            )}
          </Cell>

          <Cell label="Datas">
            <Row k="Agendamento" v={fmt(os.dataAgendamento)} />
            {os.dataInicio    && <Row k="Início"     v={fmt(os.dataInicio)} />}
            {os.dataConclusao && <Row k="Conclusão"  v={fmt(os.dataConclusao)} />}
          </Cell>
        </div>

        {/* OBSERVAÇÕES GERAIS */}
        {os.observacoesGerais && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <SectionLabel>Observações Gerais</SectionLabel>
            <p style={{ margin: 0, fontSize: '9pt' }}>{os.observacoesGerais}</p>
          </div>
        )}

        {/* CARGA DE GÁS */}
        {os.tipoGas && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <SectionLabel>Carga de Gás Refrigerante</SectionLabel>
            <p style={{ margin: 0 }}>
              <strong>{os.tipoGas}</strong>
              {os.quantidadeGasGramas != null && (
                <span style={{ color: '#555', marginLeft: '8px' }}>{Number(os.quantidadeGasGramas).toFixed(1)} g</span>
              )}
            </p>
          </div>
        )}

        {/* EQUIPAMENTOS */}
        <div style={{ padding: '12px 0' }}>
          <SectionLabel>Equipamentos e Serviços ({os.itens.length})</SectionLabel>

          {os.itens.map((item, idx) => {
            const checklistItems = parseSnapshot(item.checklistSnapshot)
            return (
              <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' }}>

                {/* Cabeçalho do equipamento */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5', padding: '6px 10px', borderBottom: '1px solid #ccc' }}>
                  <div>
                    <span style={{ color: '#999', marginRight: '4px', fontSize: '8pt' }}>{idx + 1}.</span>
                    <strong style={{ fontSize: '9.5pt' }}>{item.equipamento.nome}</strong>
                    <span style={{ color: '#666', fontSize: '8pt', marginLeft: '8px' }}>
                      {item.equipamento.marca}
                      {item.equipamento.modelo ? ` ${item.equipamento.modelo}` : ''}
                      {' · '}{item.equipamento.tipoEquipamento}
                    </span>
                    {item.equipamento.numeroSerie && (
                      <span style={{ color: '#999', fontFamily: 'monospace', fontSize: '7.5pt', marginLeft: '8px' }}>
                        S/N: {item.equipamento.numeroSerie}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '8px 10px' }}>
                  {/* Checklist */}
                  {checklistItems.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', margin: '0 0 6px 0' }}>
                        Checklist de Serviços
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
                        {checklistItems.map((ci) => (
                          <div key={ci.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                            <div style={{ width: '10px', height: '10px', border: '1px solid #999', borderRadius: '2px', marginTop: '1px', flexShrink: 0 }} />
                            <span style={{ fontSize: '8.5pt', lineHeight: 1.4 }}>
                              {ci.descricao}
                              {ci.obrigatorio && <span style={{ color: '#999', fontSize: '7pt' }}> *</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações técnicas */}
                  <div>
                    <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', margin: '0 0 4px 0' }}>
                      Observações Técnicas
                    </p>
                    {item.observacoesTecnicas ? (
                      <p style={{ fontSize: '9pt', margin: 0 }}>{item.observacoesTecnicas}</p>
                    ) : (
                      <div style={{ height: '28px', borderBottom: '1px dashed #bbb' }} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ASSINATURAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '16px', paddingTop: '16px', borderTop: '1.5px solid #111' }}>
          <div>
            {os.assinaturaBase64 ? (
              <div style={{ height: '52px', marginBottom: '4px', display: 'flex', alignItems: 'flex-end' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={os.assinaturaBase64} alt="Assinatura do técnico" style={{ maxHeight: '48px', width: 'auto' }} />
              </div>
            ) : (
              <div style={{ height: '52px', borderBottom: '1px solid #555', marginBottom: '4px' }} />
            )}
            <p style={{ fontSize: '8pt', textAlign: 'center', margin: '0 0 1px 0', color: '#444' }}>Assinatura do Técnico</p>
            <p style={{ fontSize: '7.5pt', textAlign: 'center', margin: 0, color: '#888' }}>{tecnicoLabel}</p>
          </div>

          <div>
            <div style={{ height: '52px', borderBottom: '1px solid #555', marginBottom: '4px' }} />
            <p style={{ fontSize: '8pt', textAlign: 'center', margin: '0 0 1px 0', color: '#444' }}>Assinatura / Carimbo do Responsável</p>
            <p style={{ fontSize: '7.5pt', textAlign: 'center', margin: 0, color: '#888' }}>{os.ambiente.cliente.razaoSocial}</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{ marginTop: '14px', paddingTop: '6px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            {numero} · {nomeEmpresa}
            {config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}
            {config?.telefone ? ` · ${config.telefone}` : ''}
          </p>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

      </div>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
      {children}
    </p>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 3px 0' }}>
        {label}
      </p>
      <div style={{ fontSize: '9.5pt', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p style={{ margin: '0 0 1px 0', fontSize: '9pt' }}>
      <span style={{ color: '#666' }}>{k}: </span>
      <strong>{v}</strong>
    </p>
  )
}
