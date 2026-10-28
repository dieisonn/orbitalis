'use client'

import { Printer } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean; tipo?: string; unidade?: string; opcoes?: string[] }

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

export type OS = {
  id: string; numero: number | null; status: string; origem: string
  dataAgendamento: string; horaInicio?: string | null; horaFim?: string | null; dataInicio: string | null; dataConclusao: string | null
  tipo?: string | null
  observacoesGerais: string | null
  assinaturaBase64: string | null
  tipoGas: string | null
  quantidadeGasGramas: number | null
  ambiente: {
    nome: string; localizacaoInterna: string; capacidadeTermica: string
    cliente: { razaoSocial: string; nomeFantasia: string | null; documento: string | null; endereco: string; telefone?: string | null; celular?: string | null; email?: string | null; cidade?: string | null; uf?: string | null }
  }
  tecnico: { email: string; nome: string | null } | null
  tipoServico?: { id?: string; sigla: string; nome: string } | null
  itens: Item[]
}

export type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
  email?: string | null; site?: string | null; instrucoesOs?: string | null; cidade?: string | null; uf?: string | null
} | null

const ORIGEM_LABEL: Record<string, string> = {
  manual_admin: 'Manual',
  preventiva_automatica: 'Preventiva',
  portal_cliente: 'Portal Cliente',
  orcamento_aprovado: 'Orçamento aprovado',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

// Data de agendamento é só a data (meia-noite UTC): formata em UTC para não recuar um dia
function fmtDia(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function parseSnapshot(snapshot: unknown): ChecklistItem[] {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) return snapshot as ChecklistItem[]
  try {
    const parsed = JSON.parse(String(snapshot))
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export const PRINT_CSS = `
        @page { size: A4; margin: 14mm 12mm 12mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          html, body, main { background: #fff !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        body { margin: 0; font-family: 'Arial', sans-serif; }
        * { box-sizing: border-box; }
      `

export function PrintOS({ os, config }: { os: OS; config?: Config }) {
  const numero = os.numero != null
    ? `OS-${String(os.numero).padStart(4, '0')}`
    : `OS-${os.id.slice(0, 6).toUpperCase()}`
  const cor = config?.corPrimaria ?? '#0505ad'

  return (
    <>
      <style>{PRINT_CSS}</style>

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

      <DocumentoOS os={os} config={config} />
    </>
  )
}

/** O documento da O.S. (sem a barra de ações). `modoDia` = folha do técnico, com mais espaço para anotações. */
export function DocumentoOS({ os, config, modoDia = false }: { os: OS; config?: Config; modoDia?: boolean }) {
  const numero = os.numero != null
    ? `OS-${String(os.numero).padStart(4, '0')}`
    : `OS-${os.id.slice(0, 6).toUpperCase()}`
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const logoUrl = config?.logoUrl ?? null
  const tecnicoLabel = os.tecnico ? (os.tecnico.nome ?? os.tecnico.email) : 'Não atribuído'
  const c = os.ambiente.cliente
  const fone = [c.telefone, c.celular].filter(Boolean).join(' · ')
  const dia = fmtDia(os.dataAgendamento)
  // número no padrão da lista de O.S.: SIGLA-0000 (a sigla já identifica o tipo de serviço)
  const numeroCompleto = `${os.tipoServico?.sigla ?? 'OS'}-${os.numero != null ? String(os.numero).padStart(4, '0') : os.id.slice(0, 6).toUpperCase()}`
  // dataAgendamento guarda só a DATA (meia-noite UTC); o horário fica em horaInicio/horaFim
  const entrada = `${dia}${os.horaInicio ? ` - ${os.horaInicio}` : ''}`
  const saida = `${dia}${os.horaFim ? ` - ${os.horaFim}` : ''}`
  const dataLonga = new Date(os.dataAgendamento).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  const cidadeEmpresa = [config?.cidade, config?.uf].filter(Boolean).join('/')
  const linhasObs = modoDia ? 6 : 4

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#111', background: '#fff', maxWidth: '210mm', margin: '0 auto' }}>

      {/* CABEÇALHO — identificação da empresa */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0 10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={nomeEmpresa} style={{ height: '46px', width: 'auto', objectFit: 'contain' }} />
          )}
          <div style={{ lineHeight: 1.45 }}>
            <p style={{ fontWeight: 700, fontSize: '11pt', margin: 0 }}>{nomeEmpresa.toUpperCase()}</p>
            {config?.cnpj && <p style={{ fontSize: '8pt', color: '#444', margin: 0 }}>CNPJ: {config.cnpj}</p>}
            {config?.endereco && <p style={{ fontSize: '8pt', color: '#444', margin: 0 }}>{config.endereco}</p>}
            {cidadeEmpresa && <p style={{ fontSize: '8pt', color: '#444', margin: 0 }}>{cidadeEmpresa}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: 1.45, fontSize: '8pt', color: '#333', flexShrink: 0 }}>
          {config?.telefone && <p style={{ margin: 0, fontWeight: 700 }}>{config.telefone}</p>}
          {config?.email && <p style={{ margin: 0 }}>{config.email}</p>}
          {config?.site && <p style={{ margin: 0 }}>{config.site}</p>}
        </div>
      </div>

      {/* TÍTULO */}
      <div style={{ ...barra, display: 'flex', justifyContent: 'space-between', fontSize: '11pt', padding: '5px 8px' }}>
        <span style={{ fontWeight: 700 }}>ORDEM DE SERVIÇO Nº {numeroCompleto}{os.tipoServico ? <span style={{ fontWeight: 400, fontSize: '9.5pt' }}>{`  ·  ${os.tipoServico.nome}`}</span> : null}</span>
        <span style={{ fontWeight: 700 }}>{dia}</span>
      </div>

      {/* PERÍODO DE EXECUÇÃO */}
      <Secao titulo="Período de execução">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Campo rotulo="Entrada" valor={entrada} />
          <Campo rotulo="Saída" valor={saida} esquerda />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: borda }}>
          <Campo rotulo="Chegada (técnico)" valor={<span style={{ color: '#777' }}>____/____/______  ____:____</span>} />
          <Campo rotulo="Saída (técnico)" valor={<span style={{ color: '#777' }}>____/____/______  ____:____</span>} esquerda />
        </div>
      </Secao>

      {/* MANUTENÇÃO / TÉCNICO */}
      <div style={{ border: borda, borderTop: 'none', display: 'grid', gridTemplateColumns: '1.6fr 1fr' }}>
        <div style={{ padding: '6px 8px' }}>
          <p style={rotulo}>Tipo de manutenção</p>
          <div style={{ display: 'flex', gap: '18px', marginTop: '5px' }}>
            <Caixa marcada={os.tipo === 'preventiva'}>Preventiva</Caixa>
            <Caixa marcada={os.tipo === 'corretiva'}>Corretiva</Caixa>
          </div>
          <p style={{ ...rotulo, marginTop: '8px' }}>Origem</p>
          <p style={{ margin: '2px 0 0 0' }}>{ORIGEM_LABEL[os.origem] ?? os.origem}</p>
        </div>
        <div style={{ borderLeft: borda, padding: '6px 8px', lineHeight: 1.5 }}>
          <p style={rotulo}>Técnico responsável</p>
          <p style={{ margin: '2px 0 0 0', fontWeight: 700 }}>{tecnicoLabel}</p>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <Secao titulo="Dados do cliente">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: borda }}>
          <Campo rotulo="Cliente" valor={<strong>{c.razaoSocial}{c.nomeFantasia && c.nomeFantasia !== c.razaoSocial ? ` (${c.nomeFantasia})` : ''}</strong>} />
          <Campo rotulo="CNPJ/CPF" valor={c.documento ?? ''} esquerda />
        </div>
        <div style={{ borderBottom: borda }}>
          <Campo rotulo="Endereço" valor={c.endereco} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: borda }}>
          <Campo rotulo="Cidade" valor={c.cidade ?? ''} />
          <Campo rotulo="Estado" valor={c.uf ?? ''} esquerda />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Campo rotulo="Telefone" valor={fone} />
          <Campo rotulo="E-mail" valor={c.email ?? ''} esquerda />
        </div>
      </Secao>

      {/* LOCAL E EQUIPAMENTOS */}
      <Secao titulo="Local e equipamentos">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr', borderBottom: os.itens.length ? borda : 'none' }}>
          <Campo rotulo="Ambiente" valor={<strong>{os.ambiente.nome}</strong>} />
          <Campo rotulo="Localização" valor={os.ambiente.localizacaoInterna} esquerda />
          <Campo rotulo="Cap. térmica" valor={os.ambiente.capacidadeTermica} esquerda />
        </div>

        {os.itens.map((item, idx) => {
          const checklistItems = parseSnapshot(item.checklistSnapshot)
          return (
            <div key={item.id} style={{ borderBottom: idx < os.itens.length - 1 ? borda : 'none', breakInside: 'avoid' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#f7f7f7', borderBottom: borda }}>
                <Campo rotulo={`Equipamento ${idx + 1}`} valor={<strong>{item.equipamento.nome}</strong>} />
                <Campo rotulo="Marca" valor={item.equipamento.marca} esquerda />
                <Campo rotulo="Modelo" valor={item.equipamento.modelo ?? ''} esquerda />
                <Campo rotulo="Série" valor={item.equipamento.numeroSerie ?? ''} esquerda />
              </div>
              <div style={{ padding: '6px 8px' }}>
                {checklistItems.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <p style={rotulo}>Checklist de serviços</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px', marginTop: '3px' }}>
                      {checklistItems.map((ci) => (
                        <div key={ci.id} style={{ breakInside: 'avoid' }}>
                          <Caixa marcada={false}>
                            {ci.descricao}{ci.obrigatorio ? ' *' : ''}
                            {ci.tipo === 'numero' && <span style={{ color: '#666' }}>{`  ________ ${ci.unidade ?? ''}`}</span>}
                          </Caixa>
                          {/* opções para marcar no papel */}
                          {ci.opcoes && ci.opcoes.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 8px', margin: '0 0 0 15px', lineHeight: 1.1 }}>
                              {ci.opcoes.map((o) => <Caixa key={o} marcada={false} pequeno><span style={{ fontSize: '6.5pt', color: '#444' }}>{o}</span></Caixa>)}
                            </div>
                          )}
                          {ci.tipo === 'texto' && <div style={{ height: '14px', margin: '0 0 0 15px', borderBottom: '1px solid #ccc' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p style={rotulo}>Observações técnicas</p>
                {item.observacoesTecnicas
                  ? <p style={{ margin: '3px 0 0 0' }}>{item.observacoesTecnicas}</p>
                  : <div style={{ height: '24px', borderBottom: '1px dashed #bbb' }} />}
              </div>
            </div>
          )
        })}
        {os.itens.length === 0 && (
          <p style={{ margin: 0, padding: '6px 8px', color: '#666' }}>Sem equipamento vinculado a esta O.S.</p>
        )}
      </Secao>

      {/* OBSERVAÇÕES DA O.S. / GÁS */}
      {(os.observacoesGerais || os.tipoGas) && (
        <Secao titulo="Observações">
          <div style={{ padding: '6px 8px', lineHeight: 1.5 }}>
            {os.observacoesGerais && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{os.observacoesGerais}</p>}
            {os.tipoGas && (
              <p style={{ margin: os.observacoesGerais ? '6px 0 0 0' : 0 }}>
                <span style={{ color: '#555' }}>Gás refrigerante: </span><strong>{os.tipoGas}</strong>
                {os.quantidadeGasGramas != null && <span> · {Number(os.quantidadeGasGramas).toFixed(1)} g</span>}
              </p>
            )}
          </div>
        </Secao>
      )}

      {/* INSTRUÇÕES DA EMPRESA PARA O TÉCNICO */}
      {config?.instrucoesOs && (
        <Secao titulo="Instruções">
          <p style={{ margin: 0, padding: '6px 8px', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: '8.5pt' }}>{config.instrucoesOs}</p>
        </Secao>
      )}

      {/* OBSERVAÇÕES DO TÉCNICO */}
      <Secao titulo="Observações do técnico">
        <div style={{ padding: '0 8px 4px 8px' }}>
          {Array.from({ length: linhasObs }).map((_, i) => (
            <div key={i} style={{ height: '22px', borderBottom: '1px solid #ccc' }} />
          ))}
        </div>
      </Secao>

      {/* ASSINATURAS */}
      <div style={{ border: borda, borderTop: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '10px 16px 8px 16px', breakInside: 'avoid' }}>
        <div>
          {os.assinaturaBase64 ? (
            <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', marginBottom: '3px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={os.assinaturaBase64} alt="Assinatura do técnico" style={{ maxHeight: '48px', width: 'auto' }} />
            </div>
          ) : (
            <div style={{ height: '52px', borderBottom: '1px solid #555', marginBottom: '3px' }} />
          )}
          <p style={{ fontSize: '8pt', textAlign: 'center', margin: 0, color: '#333' }}>Assinatura do técnico</p>
          <p style={{ fontSize: '7.5pt', textAlign: 'center', margin: 0, color: '#888' }}>{tecnicoLabel}</p>
        </div>
        <div>
          <div style={{ height: '52px', borderBottom: '1px solid #555', marginBottom: '3px' }} />
          <p style={{ fontSize: '8pt', textAlign: 'center', margin: 0, color: '#333' }}>Assinatura do cliente</p>
          <p style={{ fontSize: '7.5pt', textAlign: 'center', margin: 0, color: '#888' }}>{c.razaoSocial}</p>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '7pt', color: '#999', margin: 0 }}>{numero} · {nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}</p>
        <p style={{ fontSize: '7pt', color: '#999', margin: 0 }}>{modoDia ? dataLonga : new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}

const borda = '1px solid #c8c8c8'
const barra: React.CSSProperties = { background: '#e6e6e6', border: borda, padding: '3px 8px' }
const rotulo: React.CSSProperties = { fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#666', margin: 0 }

/** Bloco com barra cinza de título e corpo com borda. */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ ...barra, fontWeight: 700, fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{titulo}</div>
      <div style={{ border: borda, borderTop: 'none' }}>{children}</div>
    </div>
  )
}

/** Campo com rótulo pequeno e valor; `esquerda` desenha a divisória lateral. */
function Campo({ rotulo: r, valor, esquerda = false }: { rotulo: string; valor: React.ReactNode; esquerda?: boolean }) {
  return (
    <div style={{ padding: '4px 8px', minHeight: '30px', borderLeft: esquerda ? borda : 'none', minWidth: 0, overflowWrap: 'anywhere' }}>
      <p style={rotulo}>{r}</p>
      <div style={{ fontSize: '9pt', lineHeight: 1.4, marginTop: '1px' }}>{valor || ' '}</div>
    </div>
  )
}

/** Caixa de marcar para folha impressa. */
function Caixa({ marcada, children, pequeno }: { marcada: boolean; children: React.ReactNode; pequeno?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: pequeno ? '3px' : '5px', fontSize: '8.5pt', lineHeight: pequeno ? 1.15 : 1.25 }}>
      <span style={{ width: pequeno ? '7px' : '10px', height: pequeno ? '7px' : '10px', border: '1px solid #444', borderRadius: '2px', marginTop: pequeno ? '1px' : '1px', flexShrink: 0, fontSize: '9px', lineHeight: '9px', textAlign: 'center', fontWeight: 900 }}>
        {marcada ? '✓' : ''}
      </span>
      <span style={marcada ? { fontWeight: 700 } : undefined}>{children}</span>
    </span>
  )
}
