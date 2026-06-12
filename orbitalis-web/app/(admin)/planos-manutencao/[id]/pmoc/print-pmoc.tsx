'use client'

import { Printer } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean; tipo?: string }

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  numeroSerie: string | null
}

type OsResumo = {
  id: string
  status: string
  dataAgendamento: string
  dataConclusao: string | null
}

type Plano = {
  id: string
  frequenciaDias: number
  proximaGeracao: string
  dataFim: string | null
  ambiente: {
    nome: string
    localizacaoInterna: string
    metrosQuadrados: number
    capacidadeTermica: string
    cliente: { razaoSocial: string; nomeFantasia: string | null; documento: string; endereco: string; telefone: string | null }
  }
  tecnico: { email: string; nome: string | null } | null
  modeloChecklist: { id: string; nome: string; itens: unknown } | null
  ordensServico: OsResumo[]
  equipamentos: Equipamento[]
}

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
} | null

function parseItens(raw: unknown): ChecklistItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as ChecklistItem[]
  try { return JSON.parse(String(raw)) as ChecklistItem[] } catch { return [] }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtMesAno(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. ', '/').replace('.', '')
}

// Mapa: 'YYYY-MM' → status da OS
function buildOsMap(ordensServico: OsResumo[]) {
  const map: Record<string, { status: string; id: string }> = {}
  for (const os of ordensServico) {
    const key = os.dataAgendamento.slice(0, 7)
    map[key] = { status: os.status, id: os.id }
  }
  return map
}

export function PrintPMOC({ plano, config }: { plano: Plano; config: Config }) {
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const cor = config?.corPrimaria ?? '#0505ad'
  const logoUrl = config?.logoUrl ?? null

  const itensChecklist = parseItens(plano.modeloChecklist?.itens)
  const osMap = buildOsMap(plano.ordensServico)

  // Lista de meses únicos das O.S. em ordem cronológica
  const meses = Array.from(new Set(plano.ordensServico.map((os) => os.dataAgendamento.slice(0, 7))))
    .sort()

  const freq = plano.frequenciaDias === 30  ? 'Mensal'
             : plano.frequenciaDias === 60  ? 'Bimestral'
             : plano.frequenciaDias === 90  ? 'Trimestral'
             : plano.frequenciaDias === 180 ? 'Semestral'
             : plano.frequenciaDias === 365 ? 'Anual'
             : `A cada ${plano.frequenciaDias} dias`

  const dataInicioPMOC = plano.ordensServico.length > 0
    ? plano.ordensServico[0].dataAgendamento
    : plano.proximaGeracao

  const tecnicoLabel = plano.tecnico ? (plano.tecnico.nome ?? plano.tecnico.email) : 'Não definido'
  const clienteLabel = plano.ambiente.cliente.nomeFantasia ?? plano.ambiente.cliente.razaoSocial

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm 12mm 10mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        body { margin: 0; font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; }
      `}</style>

      {/* Barra de ações */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <a
          href={`/planos-manutencao/${plano.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors bg-white"
        >
          ← Voltar
        </a>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">PMOC — {clienteLabel} · {plano.ambiente.nome}</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: cor }}
          >
            <Printer size={14} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#1a1a1a' }}>

        {/* ═══════════════════════════════════════════ */}
        {/* PÁGINA 1 — IDENTIFICAÇÃO                   */}
        {/* ═══════════════════════════════════════════ */}

        {/* Cabeçalho */}
        <div style={{ backgroundColor: cor }} className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="bg-white rounded-xl p-1.5 shrink-0">
                <img src={logoUrl} alt={nomeEmpresa} style={{ height: '44px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : (
              <div className="bg-white/20 rounded-xl px-3 py-2 shrink-0">
                <span className="text-white font-black text-base tracking-tight">{nomeEmpresa.slice(0, 10).toUpperCase()}</span>
              </div>
            )}
            <div className="text-white">
              <p className="font-black text-base leading-tight">{nomeEmpresa}</p>
              {config?.cnpj && <p className="text-[8pt] opacity-75">CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p className="text-[8pt] opacity-75">{config.telefone}</p>}
              {config?.endereco && <p className="text-[8pt] opacity-75">{config.endereco}</p>}
            </div>
          </div>
          <div className="text-white text-right shrink-0">
            <p className="text-[8pt] uppercase tracking-widest opacity-70">Plano de Manutenção</p>
            <p className="font-black text-lg leading-tight mt-0.5">Operação e Controle</p>
            <p className="font-black text-lg" style={{ letterSpacing: '0.08em' }}>PMOC</p>
            <p className="text-[8pt] opacity-70 mt-0.5">NR-22 · Port. 3523/98 · Lei 13.589/18</p>
          </div>
        </div>
        <div style={{ height: '3px', background: `linear-gradient(to right, ${cor}, ${cor}99)` }} />

        {/* Corpo */}
        <div style={{ padding: '14px 20px' }}>

          {/* Identificação em 2 colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

            {/* Identificação do Imóvel */}
            <div style={{ border: `1px solid ${cor}40`, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: cor + '15', borderBottom: `1px solid ${cor}30`, padding: '4px 10px' }}>
                <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                  Identificação do Imóvel / Ambiente
                </p>
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Ambiente" value={plano.ambiente.nome} full />
                <InfoRow label="Localização" value={plano.ambiente.localizacaoInterna} full />
                <InfoRow label="Área" value={`${plano.ambiente.metrosQuadrados} m²`} />
                <InfoRow label="Cap. Térmica" value={plano.ambiente.capacidadeTermica} />
              </div>
            </div>

            {/* Identificação do Proprietário */}
            <div style={{ border: `1px solid ${cor}40`, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: cor + '15', borderBottom: `1px solid ${cor}30`, padding: '4px 10px' }}>
                <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                  Identificação do Proprietário / Responsável
                </p>
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Razão Social" value={plano.ambiente.cliente.razaoSocial} full />
                {plano.ambiente.cliente.nomeFantasia && (
                  <InfoRow label="Nome Fantasia" value={plano.ambiente.cliente.nomeFantasia} full />
                )}
                <InfoRow label="CNPJ / CPF" value={plano.ambiente.cliente.documento} />
                <InfoRow label="Telefone" value={plano.ambiente.cliente.telefone ?? '—'} />
                <InfoRow label="Endereço" value={plano.ambiente.cliente.endereco} full />
              </div>
            </div>
          </div>

          {/* Responsável Técnico + Vigência */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

            <div style={{ border: `1px solid ${cor}40`, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: cor + '15', borderBottom: `1px solid ${cor}30`, padding: '4px 10px' }}>
                <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                  Responsável Técnico
                </p>
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Nome" value={tecnicoLabel} full />
                <InfoRow label="E-mail" value={plano.tecnico?.email ?? '—'} full />
                <InfoRow label="Registro no Conselho" value="______________________" />
                <InfoRow label="ART / TRT" value="______________________" />
              </div>
            </div>

            <div style={{ border: `1px solid ${cor}40`, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: cor + '15', borderBottom: `1px solid ${cor}30`, padding: '4px 10px' }}>
                <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                  Vigência do PMOC
                </p>
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Início" value={fmtDate(dataInicioPMOC)} />
                <InfoRow label="Fim" value={fmtDate(plano.dataFim)} />
                <InfoRow label="Periodicidade" value={freq} />
                <InfoRow label="Qtd. Ciclos" value={String(plano.ordensServico.length)} />
              </div>
            </div>
          </div>

          {/* Tabela de ambientes / equipamentos */}
          <div style={{ border: `1px solid ${cor}40`, borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ backgroundColor: cor + '15', borderBottom: `1px solid ${cor}30`, padding: '4px 10px' }}>
              <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                Ambientes Climatizados e Equipamentos
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
              <thead>
                <tr style={{ backgroundColor: cor + '08' }}>
                  {['Nº', 'Equipamento', 'Tipo', 'Marca / Modelo', 'Nº Série', 'Ambiente / Local'].map((h) => (
                    <th key={h} style={{
                      padding: '5px 8px',
                      textAlign: 'left',
                      fontSize: '7pt',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#6b7280',
                      borderBottom: `1px solid ${cor}20`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plano.equipamentos.map((eq, idx) => (
                  <tr key={eq.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 1 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '5px 8px', color: '#9ca3af', fontSize: '7pt' }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{eq.nome}</td>
                    <td style={{ padding: '5px 8px', color: '#6b7280' }}>{eq.tipoEquipamento}</td>
                    <td style={{ padding: '5px 8px', color: '#6b7280' }}>
                      {[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: '7.5pt', color: '#6b7280' }}>
                      {eq.numeroSerie || '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#6b7280' }}>
                      {plano.ambiente.nome} · {plano.ambiente.localizacaoInterna}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '7pt', color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Concluída</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#ca8a04' }}>Pend. — Agendada / Em andamento</span>
            </span>
            <span>N/A — Cancelada</span>
            <span>— — Não programada</span>
          </div>

        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PÁGINAS SEGUINTES — CHECKLIST POR EQUIPAMENTO */}
        {/* ═══════════════════════════════════════════ */}
        {plano.equipamentos.map((eq, eqIdx) => (
          <div key={eq.id} className={eqIdx === 0 ? 'page-break' : 'page-break'} style={{ paddingTop: '0', pageBreakBefore: 'always' }}>

            {/* Mini cabeçalho repetido */}
            <div style={{ backgroundColor: cor + '10', borderBottom: `2px solid ${cor}`, padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <p style={{ fontSize: '7pt', color: cor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PMOC — Checklist de Manutenção</p>
                <p style={{ fontSize: '9pt', fontWeight: 700, color: '#111' }}>{eq.nome} · {eq.tipoEquipamento}</p>
                <p style={{ fontSize: '7pt', color: '#6b7280' }}>
                  {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                  {eq.numeroSerie ? ` · S/N: ${eq.numeroSerie}` : ''}
                  {' · '}{plano.ambiente.nome}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280' }}>{clienteLabel}</p>
                <p style={{ fontSize: '7pt', color: '#6b7280' }}>{freq} · {fmtDate(dataInicioPMOC)} – {fmtDate(plano.dataFim)}</p>
                <p style={{ fontSize: '7pt', color: '#6b7280' }}>Equipamento {eqIdx + 1} / {plano.equipamentos.length}</p>
              </div>
            </div>

            <div style={{ padding: '0 20px 14px' }}>
              {itensChecklist.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '8pt', fontStyle: 'italic' }}>Nenhum checklist vinculado a este plano.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
                    <thead>
                      <tr>
                        <th style={{
                          width: '32px',
                          padding: '5px 4px',
                          textAlign: 'center',
                          fontSize: '6.5pt',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#9ca3af',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                        }}>Nº</th>
                        <th style={{
                          padding: '5px 8px',
                          textAlign: 'left',
                          fontSize: '6.5pt',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#6b7280',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                        }}>Serviço / Verificação</th>
                        {meses.map((mes) => (
                          <th key={mes} style={{
                            padding: '5px 3px',
                            textAlign: 'center',
                            fontSize: '6.5pt',
                            fontWeight: 700,
                            color: cor,
                            border: '1px solid #e5e7eb',
                            backgroundColor: cor + '08',
                            whiteSpace: 'nowrap',
                            minWidth: '38px',
                          }}>
                            {fmtMesAno(mes + '-01')}
                          </th>
                        ))}
                        {meses.length === 0 && (
                          <th style={{ padding: '5px 8px', fontSize: '6.5pt', color: '#9ca3af', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            (sem O.S. registradas)
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {itensChecklist.map((item, idx) => (
                        <tr key={item.id} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : 'white' }}>
                          <td style={{ padding: '4px', textAlign: 'center', color: '#9ca3af', fontSize: '6.5pt', border: '1px solid #e5e7eb' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>
                            <span style={{ fontWeight: item.obrigatorio ? 600 : 400 }}>
                              {item.descricao}
                            </span>
                            {item.obrigatorio && (
                              <span style={{ color: '#ef4444', fontSize: '6pt', marginLeft: '3px' }}>*</span>
                            )}
                          </td>
                          {meses.map((mes) => {
                            const entry = osMap[mes]
                            return (
                              <td key={mes} style={{
                                padding: '4px 3px',
                                textAlign: 'center',
                                fontSize: '7pt',
                                border: '1px solid #e5e7eb',
                                ...(entry?.status === 'concluida'
                                  ? { backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }
                                  : entry?.status === 'cancelada'
                                  ? { backgroundColor: '#f9fafb', color: '#9ca3af' }
                                  : entry
                                  ? { backgroundColor: '#fefce8', color: '#ca8a04' }
                                  : { color: '#d1d5db' }),
                              }}>
                                {entry?.status === 'concluida' ? '✓'
                                  : entry?.status === 'cancelada' ? 'N/A'
                                  : entry ? 'Pend.'
                                  : '—'}
                              </td>
                            )
                          })}
                          {meses.length === 0 && (
                            <td style={{ border: '1px solid #e5e7eb', color: '#d1d5db', textAlign: 'center', fontSize: '7pt' }}>—</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Observações + Assinatura */}
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px' }}>
                  <p style={{ fontSize: '7pt', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    Observações Técnicas
                  </p>
                  <div style={{ height: '48px', borderBottom: '1px dashed #d1d5db' }} />
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px' }}>
                  <p style={{ fontSize: '7pt', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    Assinatura do Técnico Responsável
                  </p>
                  <div style={{ height: '48px', borderBottom: '1px dashed #d1d5db' }} />
                  <p style={{ fontSize: '6.5pt', color: '#9ca3af', marginTop: '3px', textAlign: 'center' }}>{tecnicoLabel}</p>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div style={{ backgroundColor: cor + '10', borderTop: `1px solid ${cor}20`, padding: '5px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '6.5pt', color: '#9ca3af' }}>
                {nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}{config?.telefone ? ` · ${config.telefone}` : ''}
              </p>
              <p style={{ fontSize: '6.5pt', color: '#9ca3af' }}>
                PMOC — {clienteLabel} · Gerado em {new Date().toLocaleDateString('pt-BR')} · Pág. {eqIdx + 2}
              </p>
            </div>

          </div>
        ))}

      </div>
    </>
  )
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <p style={{ fontSize: '6.5pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1px' }}>
        {label}
      </p>
      <p style={{ fontSize: '8pt', fontWeight: 500, color: '#374151' }}>{value || '—'}</p>
    </div>
  )
}
