'use client'

import type { CSSProperties } from 'react'
import { Printer } from 'lucide-react'

type ChecklistItem = { id: string; descricao: string; obrigatorio: boolean; tipo?: string }

type AmbienteInfo = {
  id: string
  nome: string
  localizacaoInterna: string
  metrosQuadrados: number
  capacidadeTermica: string
}

type EquipamentoInfo = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  numeroSerie: string | null
  ambienteId: string
  ambiente: AmbienteInfo
}

type EquipConfig = {
  equipamentoId: string
  modeloChecklistId: string | null
  equipamento: EquipamentoInfo
  modeloChecklist: { id: string; nome: string; itens: unknown } | null
}

type OsResumo = {
  id: string
  status: string
  dataAgendamento: string
  dataConclusao: string | null
  ambienteId: string
}

export type Plano = {
  id: string
  frequenciaDias: number
  proximaGeracao: string
  dataFim: string | null
  cliente: {
    razaoSocial: string
    nomeFantasia: string | null
    documento: string
    endereco: string
    telefone: string | null
  }
  tecnico: { email: string; nome: string | null; crea?: string | null } | null
  equipamentosConfig: EquipConfig[]
  ordensServico: OsResumo[]
}

type Config = {
  nomeEmpresa: string
  nomeFantasia: string | null
  logoUrl: string | null
  corPrimaria: string | null
  cnpj: string | null
  telefone: string | null
  endereco: string | null
  responsavelTecnico?: { id: string; nome: string | null; email: string; crea: string | null } | null
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

function fmtMesAno(mesKey: string) {
  const [ano, m] = mesKey.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${ano.slice(2)}`
}

// ─── helpers de estilo ────────────────────────────────────────────────────────
const S = {
  label: (cor: string) => ({
    fontSize: '7pt' as const,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: cor,
  }),
  sectionHeader: (cor: string): CSSProperties => ({
    backgroundColor: cor + '18',
    borderBottom: `1px solid ${cor}30`,
    padding: '5px 12px',
  }),
  sectionBody: { padding: '8px 12px' } as CSSProperties,
  box: (cor: string): CSSProperties => ({
    border: `1px solid ${cor}35`,
    borderRadius: '6px',
    overflow: 'hidden',
  }),
}

export function PrintPMOC({ plano, config }: { plano: Plano; config: Config }) {
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const cor = config?.corPrimaria ?? '#0505ad'
  const logoUrl = config?.logoUrl ?? null

  // OS map por ambienteId → { mesKey: { status, id } }
  const osMapByAmbiente: Record<string, Record<string, { status: string; id: string }>> = {}
  for (const os of plano.ordensServico) {
    const mesKey = os.dataAgendamento.slice(0, 7)
    if (!osMapByAmbiente[os.ambienteId]) osMapByAmbiente[os.ambienteId] = {}
    osMapByAmbiente[os.ambienteId][mesKey] = { status: os.status, id: os.id }
  }

  const meses = Array.from(new Set(plano.ordensServico.map((os) => os.dataAgendamento.slice(0, 7)))).sort()
  const nMeses = meses.length || 12

  const freq = plano.frequenciaDias === 30  ? 'Mensal'
             : plano.frequenciaDias === 60  ? 'Bimestral'
             : plano.frequenciaDias === 90  ? 'Trimestral'
             : plano.frequenciaDias === 180 ? 'Semestral'
             : plano.frequenciaDias === 365 ? 'Anual'
             : `A cada ${plano.frequenciaDias} dias`

  const dataInicioPMOC = plano.ordensServico.length > 0
    ? plano.ordensServico[0].dataAgendamento
    : plano.proximaGeracao

  const responsavel = config?.responsavelTecnico ?? plano.tecnico
  const tecnicoLabel = plano.tecnico ? (plano.tecnico.nome ?? plano.tecnico.email) : 'Não definido'
  const responsavelLabel = responsavel ? (responsavel.nome ?? responsavel.email) : tecnicoLabel
  const responsavelCrea = responsavel?.crea ?? plano.tecnico?.crea ?? null
  const clienteLabel = plano.cliente.nomeFantasia ?? plano.cliente.razaoSocial

  // Agrupa equipamentos por ambiente para inventário
  const ambienteMap = new Map<string, { ambiente: AmbienteInfo; configs: EquipConfig[] }>()
  for (const config of plano.equipamentosConfig) {
    const amb = config.equipamento.ambiente
    if (!ambienteMap.has(amb.id)) ambienteMap.set(amb.id, { ambiente: amb, configs: [] })
    ambienteMap.get(amb.id)!.configs.push(config)
  }
  const ambienteGroups = Array.from(ambienteMap.values())

  // Larguras da tabela de checklist para retrato A4 (~186mm úteis)
  const descPct = Math.max(38, 46 - nMeses * 0.5)
  const mesPct  = (100 - 3 - descPct) / nMeses

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 14mm 14mm 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; break-before: page; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
        }
        body { margin: 0; font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; }
      `}</style>

      {/* ── Barra de ações (só na tela) ─────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <a href={`/planos-manutencao/${plano.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 bg-white">
          ← Voltar
        </a>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">PMOC — {clienteLabel}</span>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg"
            style={{ backgroundColor: cor }}>
            <Printer size={14} />Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      {/* ═══════════════════════════════════════════════════════════
          PÁGINA 1 — CAPA
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ pageBreakAfter: 'always', minHeight: '260mm', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>

        <div style={{ backgroundColor: cor, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {logoUrl ? (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '8px 10px' }}>
                <img src={logoUrl} alt={nomeEmpresa} style={{ height: '56px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '14pt', letterSpacing: '0.06em' }}>
                  {nomeEmpresa.slice(0, 10).toUpperCase()}
                </span>
              </div>
            )}
            <div style={{ color: 'white' }}>
              <p style={{ fontWeight: 900, fontSize: '14pt', lineHeight: 1.1 }}>{nomeEmpresa}</p>
              {config?.cnpj    && <p style={{ fontSize: '8pt', opacity: 0.8, marginTop: '2px' }}>CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p style={{ fontSize: '8pt', opacity: 0.8 }}>{config.telefone}</p>}
              {config?.endereco && <p style={{ fontSize: '8pt', opacity: 0.8 }}>{config.endereco}</p>}
            </div>
          </div>
          <div style={{ color: 'white', textAlign: 'right' }}>
            <p style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>Documento</p>
            <p style={{ fontWeight: 900, fontSize: '20pt', letterSpacing: '0.15em', lineHeight: 1 }}>PMOC</p>
            <p style={{ fontSize: '7pt', opacity: 0.7, marginTop: '2px' }}>Nº {plano.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div style={{ height: '4px', background: `linear-gradient(90deg, ${cor}, ${cor}60)` }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', backgroundColor: '#fafbff' }}>
          <div style={{ width: '60px', height: '3px', backgroundColor: cor, marginBottom: '20px', borderRadius: '2px' }} />
          <p style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1.6 }}>Plano de Manutenção,</p>
          <p style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1.6 }}>Operação e Controle</p>
          <p style={{ fontSize: '38pt', fontWeight: 900, color: cor, letterSpacing: '0.25em', margin: '8px 0 4px' }}>PMOC</p>
          <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '20px', letterSpacing: '0.04em' }}>
            Portaria MS nº 3.523/98 · Lei Federal nº 13.589/2018 · ANVISA RDC nº 09/2003
          </p>
          <div style={{ width: '60px', height: '3px', backgroundColor: cor, borderRadius: '2px' }} />
        </div>

        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Contratante</p></div>
              <div style={S.sectionBody}>
                <p style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '3px' }}>{plano.cliente.razaoSocial}</p>
                {plano.cliente.nomeFantasia && <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '3px' }}>{plano.cliente.nomeFantasia}</p>}
                <p style={{ fontSize: '7.5pt', color: '#6b7280' }}>CNPJ/CPF: {plano.cliente.documento}</p>
                {plano.cliente.telefone && <p style={{ fontSize: '7.5pt', color: '#6b7280' }}>Tel: {plano.cliente.telefone}</p>}
                <p style={{ fontSize: '7.5pt', color: '#6b7280', marginTop: '2px' }}>{plano.cliente.endereco}</p>
              </div>
            </div>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Ambientes Climatizados</p></div>
              <div style={S.sectionBody}>
                {ambienteGroups.map(({ ambiente, configs }) => (
                  <div key={ambiente.id} style={{ marginBottom: '5px' }}>
                    <p style={{ fontWeight: 700, fontSize: '8.5pt' }}>{ambiente.nome}</p>
                    <p style={{ fontSize: '7pt', color: '#6b7280' }}>{ambiente.localizacaoInterna} · {ambiente.metrosQuadrados} m² · {ambiente.capacidadeTermica}</p>
                    <p style={{ fontSize: '7pt', color: '#6b7280' }}>{configs.length} equipamento(s)</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Responsável Técnico</p></div>
              <div style={S.sectionBody}>
                <p style={{ fontWeight: 600, fontSize: '9pt', marginBottom: '3px' }}>{responsavelLabel}</p>
                <p style={{ fontSize: '7.5pt', color: '#6b7280', marginBottom: '6px' }}>{responsavel?.email ?? plano.tecnico?.email ?? ''}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '6.5pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CREA / Registro</p>
                    {responsavelCrea ? (
                      <p style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', marginTop: '3px', fontFamily: 'monospace' }}>{responsavelCrea}</p>
                    ) : (
                      <div style={{ borderBottom: '1px solid #d1d5db', height: '18px', marginTop: '2px' }} />
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: '6.5pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ART / TRT</p>
                    <div style={{ borderBottom: '1px solid #d1d5db', height: '18px', marginTop: '2px' }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Vigência do PMOC</p></div>
              <div style={S.sectionBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                  <div>
                    <p style={{ fontSize: '6.5pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Início</p>
                    <p style={{ fontSize: '9pt', fontWeight: 600 }}>{fmtDate(dataInicioPMOC)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '6.5pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Término</p>
                    <p style={{ fontSize: '9pt', fontWeight: 600 }}>{fmtDate(plano.dataFim)}</p>
                  </div>
                </div>
                <p style={{ fontSize: '7.5pt', color: '#6b7280' }}>Periodicidade: <strong>{freq}</strong></p>
                <p style={{ fontSize: '7.5pt', color: '#6b7280', marginTop: '2px' }}>Ciclos previstos: <strong>{plano.ordensServico.length}</strong></p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '8px', borderTop: `1px solid ${cor}20` }}>
            {[
              { label: 'Responsável Técnico', sub: tecnicoLabel },
              { label: 'Representante Legal do Contratante', sub: clienteLabel },
              { label: 'Data de Emissão', sub: new Date().toLocaleDateString('pt-BR') },
            ].map(({ label, sub }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #374151', height: '36px', marginBottom: '4px' }} />
                <p style={{ fontSize: '7pt', color: '#374151', fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: '6.5pt', color: '#9ca3af', marginTop: '1px' }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: cor + '10', borderTop: `1px solid ${cor}20`, padding: '6px 24px', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '6.5pt', color: '#9ca3af' }}>{nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}</p>
          <p style={{ fontSize: '6.5pt', color: '#9ca3af' }}>PMOC Nº {plano.id.slice(0, 8).toUpperCase()} · Pág. 1</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PÁGINA 2 — IDENTIFICAÇÃO + INVENTÁRIO
      ═══════════════════════════════════════════════════════════ */}
      <div className="page-break" style={{ fontFamily: 'Arial, sans-serif' }}>
        <MiniHeader cor={cor} nomeEmpresa={nomeEmpresa} logoUrl={logoUrl} titulo="Identificação e Inventário de Equipamentos" />

        <div style={{ padding: '12px 20px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Contratante</p></div>
              <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Razão Social"  value={plano.cliente.razaoSocial} full />
                {plano.cliente.nomeFantasia && <InfoRow label="Nome Fantasia" value={plano.cliente.nomeFantasia} full />}
                <InfoRow label="CNPJ / CPF"   value={plano.cliente.documento} />
                <InfoRow label="Telefone"      value={plano.cliente.telefone ?? '—'} />
                <InfoRow label="Endereço"      value={plano.cliente.endereco} full />
              </div>
            </div>
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Responsável Técnico</p></div>
              <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Nome"   value={tecnicoLabel} full />
                <InfoRow label="E-mail" value={plano.tecnico?.email ?? '—'} full />
                <InfoRow label="Registro no Conselho" value="________________________" />
                <InfoRow label="ART / TRT"            value="________________________" />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {ambienteGroups.map(({ ambiente }) => (
              <div key={ambiente.id} style={S.box(cor)}>
                <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Ambiente: {ambiente.nome}</p></div>
                <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <InfoRow label="Localização" value={ambiente.localizacaoInterna} full />
                  <InfoRow label="Área"         value={`${Number(ambiente.metrosQuadrados).toFixed(0)} m²`} />
                  <InfoRow label="Cap. Térmica" value={ambiente.capacidadeTermica} />
                </div>
              </div>
            ))}
            <div style={S.box(cor)}>
              <div style={S.sectionHeader(cor)}><p style={S.label(cor)}>Vigência do PMOC</p></div>
              <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <InfoRow label="Início"         value={fmtDate(dataInicioPMOC)} />
                <InfoRow label="Término"        value={fmtDate(plano.dataFim)} />
                <InfoRow label="Periodicidade"  value={freq} />
                <InfoRow label="Ciclos"         value={String(plano.ordensServico.length)} />
              </div>
            </div>
          </div>

          {/* Inventário de equipamentos agrupado por ambiente */}
          {ambienteGroups.map(({ ambiente, configs }, gIdx) => (
            <div key={ambiente.id} style={{ ...S.box(cor), marginBottom: '10px' }}>
              <div style={S.sectionHeader(cor)}>
                <p style={S.label(cor)}>{ambiente.nome} — {ambiente.localizacaoInterna}</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                <thead>
                  <tr style={{ backgroundColor: cor + '08' }}>
                    {['Nº', 'Equipamento', 'Tipo', 'Marca / Modelo', 'Nº Série', 'Checklist'].map((h) => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: '6.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', borderBottom: `1px solid ${cor}20` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c, idx) => (
                    <tr key={c.equipamentoId} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 1 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '5px 8px', color: '#9ca3af', fontSize: '7pt' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 600 }}>{c.equipamento.nome}</td>
                      <td style={{ padding: '5px 8px', color: '#6b7280' }}>{c.equipamento.tipoEquipamento}</td>
                      <td style={{ padding: '5px 8px', color: '#6b7280' }}>{[c.equipamento.marca, c.equipamento.modelo].filter(Boolean).join(' ') || '—'}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: '7.5pt', color: '#6b7280' }}>{c.equipamento.numeroSerie || '—'}</td>
                      <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: '7pt' }}>{c.modeloChecklist?.nome ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '18px', fontSize: '7pt', color: '#6b7280', flexWrap: 'wrap' }}>
            <span><strong style={{ color: '#16a34a' }}>✓</strong> Concluída</span>
            <span style={{ color: '#ca8a04' }}>Pend. — Agendada / Em andamento</span>
            <span>N/A — Cancelada</span>
            <span style={{ color: '#d1d5db' }}>— — Não programada</span>
          </div>
        </div>

        <PageFooter cor={cor} nomeEmpresa={nomeEmpresa} config={config} clienteLabel={clienteLabel} pagina={2} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PÁGINAS 3+ — CHECKLIST POR EQUIPAMENTO
      ═══════════════════════════════════════════════════════════ */}
      {plano.equipamentosConfig.map((c, eqIdx) => {
        const itensChecklist = parseItens(c.modeloChecklist?.itens)
        const osMap = osMapByAmbiente[c.equipamento.ambienteId] ?? {}

        return (
          <div key={c.equipamentoId} className="page-break" style={{ fontFamily: 'Arial, sans-serif', pageBreakBefore: 'always' }}>
            <MiniHeader
              cor={cor}
              nomeEmpresa={nomeEmpresa}
              logoUrl={logoUrl}
              titulo={`Checklist de Manutenção — ${c.equipamento.nome}`}
              sub={`${[c.equipamento.marca, c.equipamento.modelo].filter(Boolean).join(' ')}${c.equipamento.numeroSerie ? ` · S/N: ${c.equipamento.numeroSerie}` : ''} · ${c.equipamento.tipoEquipamento}`}
              right={`${clienteLabel} · ${c.equipamento.ambiente.nome} · ${freq} · ${fmtDate(dataInicioPMOC)} – ${fmtDate(plano.dataFim)} · Equip. ${eqIdx + 1}/${plano.equipamentosConfig.length}`}
            />

            <div style={{ padding: '8px 20px 10px' }}>
              {itensChecklist.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '8pt', fontStyle: 'italic' }}>Nenhum checklist vinculado a este equipamento.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '7pt' }}>
                  <colgroup>
                    <col style={{ width: '3%' }} />
                    <col style={{ width: `${descPct}%` }} />
                    {meses.map((m) => <col key={m} style={{ width: `${mesPct}%` }} />)}
                    {meses.length === 0 && <col style={{ width: '57%' }} />}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 2px', textAlign: 'center', fontSize: '6pt', fontWeight: 700, color: '#9ca3af', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Nº</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: '6pt', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        Serviço / Verificação
                      </th>
                      {meses.map((mes) => (
                        <th key={mes} style={{ padding: '4px 1px', textAlign: 'center', fontSize: '5.5pt', fontWeight: 700, color: cor, border: '1px solid #e5e7eb', backgroundColor: cor + '08', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          {fmtMesAno(mes)}
                        </th>
                      ))}
                      {meses.length === 0 && (
                        <th style={{ padding: '4px 8px', fontSize: '6pt', color: '#9ca3af', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                          (sem O.S. registradas)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {itensChecklist.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '3px 2px', textAlign: 'center', color: '#9ca3af', fontSize: '6pt', border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #e5e7eb', lineHeight: 1.3 }}>
                          <span style={{ fontSize: '7pt', fontWeight: item.obrigatorio ? 600 : 400 }}>{item.descricao}</span>
                          {item.obrigatorio && <span style={{ color: '#ef4444', fontSize: '5.5pt', marginLeft: '2px' }}>*</span>}
                        </td>
                        {meses.map((mes) => {
                          const entry = osMap[mes]
                          const bg = entry?.status === 'concluida'
                            ? { backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }
                            : entry?.status === 'cancelada'
                            ? { backgroundColor: '#f9fafb', color: '#9ca3af' }
                            : entry
                            ? { backgroundColor: '#fefce8', color: '#ca8a04' }
                            : { color: '#d1d5db' }
                          return (
                            <td key={mes} style={{ padding: '3px 1px', textAlign: 'center', fontSize: '6pt', border: '1px solid #e5e7eb', ...bg }}>
                              {entry?.status === 'concluida' ? '✓'
                                : entry?.status === 'cancelada' ? 'N/A'
                                : entry ? 'Pend.'
                                : '—'}
                            </td>
                          )
                        })}
                        {meses.length === 0 && (
                          <td style={{ border: '1px solid #e5e7eb', color: '#d1d5db', textAlign: 'center', fontSize: '6pt' }}>—</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px' }}>
                  <p style={{ fontSize: '6.5pt', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Observações Técnicas</p>
                  <div style={{ height: '44px', borderBottom: '1px dashed #d1d5db' }} />
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px' }}>
                  <p style={{ fontSize: '6.5pt', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Assinatura do Técnico Responsável</p>
                  <div style={{ height: '44px', borderBottom: '1px dashed #d1d5db' }} />
                  <p style={{ fontSize: '6pt', color: '#9ca3af', marginTop: '3px', textAlign: 'center' }}>{tecnicoLabel}</p>
                </div>
              </div>
            </div>

            <PageFooter cor={cor} nomeEmpresa={nomeEmpresa} config={config} clienteLabel={clienteLabel} pagina={eqIdx + 3} />
          </div>
        )
      })}
    </>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function MiniHeader({ cor, nomeEmpresa, logoUrl, titulo, sub, right }: {
  cor: string; nomeEmpresa: string; logoUrl: string | null
  titulo: string; sub?: string; right?: string
}) {
  return (
    <div style={{ backgroundColor: cor + '0e', borderBottom: `2px solid ${cor}`, padding: '7px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {logoUrl ? (
          <img src={logoUrl} alt={nomeEmpresa} style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontWeight: 900, fontSize: '9pt', color: cor }}>{nomeEmpresa.slice(0, 8)}</span>
        )}
        <div>
          <p style={{ fontSize: '6pt', color: cor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PMOC</p>
          <p style={{ fontSize: '8.5pt', fontWeight: 700, color: '#111' }}>{titulo}</p>
          {sub && <p style={{ fontSize: '6.5pt', color: '#6b7280' }}>{sub}</p>}
        </div>
      </div>
      {right && <p style={{ fontSize: '6.5pt', color: '#6b7280', textAlign: 'right', maxWidth: '160px' }}>{right}</p>}
    </div>
  )
}

function PageFooter({ cor, nomeEmpresa, config, clienteLabel, pagina }: {
  cor: string; nomeEmpresa: string; config: Config; clienteLabel: string; pagina: number
}) {
  return (
    <div style={{ backgroundColor: cor + '0e', borderTop: `1px solid ${cor}20`, padding: '5px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
      <p style={{ fontSize: '6pt', color: '#9ca3af' }}>
        {nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}{config?.telefone ? ` · ${config.telefone}` : ''}
      </p>
      <p style={{ fontSize: '6pt', color: '#9ca3af' }}>
        PMOC — {clienteLabel} · Emitido em {new Date().toLocaleDateString('pt-BR')} · Pág. {pagina}
      </p>
    </div>
  )
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <p style={{ fontSize: '6pt', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1px' }}>{label}</p>
      <p style={{ fontSize: '8pt', fontWeight: 500, color: '#374151' }}>{value || '—'}</p>
    </div>
  )
}
