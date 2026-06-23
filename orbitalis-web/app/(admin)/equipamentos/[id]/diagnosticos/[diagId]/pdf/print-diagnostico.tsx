'use client'

import { Printer } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'

type Kpi = { media: number; min: number; max: number }
type Anomalia = { nivel: 'normal' | 'atencao' | 'critico'; parametro: string; valor: string; mensagem: string }
type SerieIdu = { time: string; scsh: number | null; pipeIn: number | null; pipeOut: number | null }
type SerieOdu = { time: string; highPress: number | null; lowPress: number | null; power: number | null; freq: number | null }

type Relatorio = {
  status: 'normal' | 'atencao' | 'critico'
  modo: string
  duracao: string
  totalLeituras: number
  errosEncontrados: string[]
  kpis: {
    superaquecimento?: Kpi; pressaoAlta?: Kpi; pressaoBaixa?: Kpi
    tempDescarga?: Kpi; tempEvaporacao?: Kpi; tempCondensacao?: Kpi
    consumo?: Kpi; freqCompressor?: Kpi
  }
  anomalias: Anomalia[]
  laudo: string
  seriesIdu: SerieIdu[]
  seriesOdu: SerieOdu[]
}

type Diag = {
  id: string
  criadoEm: string
  dataInspecao: string | null
  arquivoIduNome: string | null
  arquivoOduNome: string | null
  relatorio: Relatorio
  equipamento: { id: string; nome: string; marca: string; modelo: string | null; tipoEquipamento: string; numeroSerie: string | null }
}

type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null
  corPrimaria: string | null; cnpj: string | null; telefone: string | null; endereco: string | null
} | null

const STATUS_LABEL = { normal: 'Normal', atencao: 'Atenção', critico: 'Crítico' }
const STATUS_COLOR = { normal: '#059669', atencao: '#d97706', critico: '#dc2626' }
const NIVEL_COLOR  = { normal: '#059669', atencao: '#d97706', critico: '#dc2626' }

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function ds<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

function KpiRow({ label, kpi, unit }: { label: string; kpi?: Kpi; unit: string }) {
  if (!kpi) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: '8.5pt', color: '#555' }}>{label}</span>
      <span style={{ fontSize: '8.5pt', fontWeight: 700 }}>
        {kpi.media} {unit}
        <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>({kpi.min}–{kpi.max})</span>
      </span>
    </div>
  )
}

export function PrintDiagnostico({ diag, config }: { diag: Diag; config?: Config }) {
  const r = diag.relatorio
  const eq = diag.equipamento
  const cor = config?.corPrimaria ?? '#0505ad'
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const logoUrl = config?.logoUrl ?? null

  const iduSamples = ds(r.seriesIdu, 80)
  const oduSamples = ds(r.seriesOdu, 80)

  const statusColor = STATUS_COLOR[r.status]
  const statusLabel = STATUS_LABEL[r.status]

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm 12mm 12mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        body { margin: 0; font-family: Arial, sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Toolbar — apenas na tela */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href=".." className="text-sm text-gray-600 hover:text-gray-900 font-medium">← Voltar</a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{eq.nome} · Diagnóstico LGMV</span>
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

      {/* ── DOCUMENTO A4 ── */}
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', color: '#111', background: '#fff', maxWidth: '186mm', margin: '0 auto' }}>

        {/* Faixa de cor */}
        <div style={{ height: '5px', backgroundColor: cor, width: '100%' }} />

        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0 10px 0', borderBottom: '1.5px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={nomeEmpresa} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 900, fontSize: '14pt' }}>{nomeEmpresa.toUpperCase()}</span>
            )}
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px', lineHeight: 1.5 }}>
              {logoUrl && <p style={{ fontWeight: 700, fontSize: '10pt', margin: 0 }}>{nomeEmpresa}</p>}
              {config?.cnpj    && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>CNPJ: {config.cnpj}</p>}
              {config?.telefone && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.telefone}</p>}
              {config?.endereco && <p style={{ fontSize: '7.5pt', color: '#555', margin: 0 }}>{config.endereco}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', margin: '0 0 2px 0' }}>Diagnóstico LGMV</p>
            <p style={{ fontSize: '7.5pt', color: '#666', margin: '2px 0 0 0' }}>
              {diag.dataInspecao ? `Inspeção: ${fmt(diag.dataInspecao)}` : `Gerado em: ${fmt(diag.criadoEm)}`}
            </p>
            <span style={{
              display: 'inline-block', marginTop: '4px',
              padding: '2px 10px', borderRadius: '20px', fontSize: '9pt', fontWeight: 700,
              backgroundColor: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}55`,
            }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* EQUIPAMENTO */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
          <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 4px 0' }}>Equipamento</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '10pt' }}>{eq.nome}</p>
          <p style={{ margin: '2px 0 0 0', color: '#555' }}>
            {eq.marca}{eq.modelo ? ` ${eq.modelo}` : ''} · {eq.tipoEquipamento}
            {eq.numeroSerie ? ` · S/N ${eq.numeroSerie}` : ''}
          </p>
          {(diag.arquivoIduNome || diag.arquivoOduNome) && (
            <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '7.5pt' }}>
              Arquivos: {[diag.arquivoIduNome, diag.arquivoOduNome].filter(Boolean).join(' + ')}
            </p>
          )}
          <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '7.5pt' }}>
            Modo: {r.modo} · Duração: {r.duracao} · {r.totalLeituras} leituras
          </p>
        </div>

        {/* LAUDO */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd', backgroundColor: statusColor + '0d' }}>
          <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 4px 0' }}>Laudo Técnico</p>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{r.laudo}</p>
        </div>

        {/* KPIs — 2 colunas */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
          <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>Parâmetros de Operação</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <KpiRow label="Superaquecimento" kpi={r.kpis.superaquecimento} unit="°C" />
            <KpiRow label="Pressão de Sucção" kpi={r.kpis.pressaoBaixa} unit="psi" />
            <KpiRow label="Pressão de Descarga" kpi={r.kpis.pressaoAlta} unit="psi" />
            <KpiRow label="Temp. Descarga" kpi={r.kpis.tempDescarga} unit="°C" />
            <KpiRow label="Temp. Evaporação" kpi={r.kpis.tempEvaporacao} unit="°C" />
            <KpiRow label="Temp. Condensação" kpi={r.kpis.tempCondensacao} unit="°C" />
            <KpiRow label="Consumo Elétrico" kpi={r.kpis.consumo} unit="kW" />
            <KpiRow label="Freq. Compressor" kpi={r.kpis.freqCompressor} unit="Hz" />
          </div>
        </div>

        {/* ANOMALIAS */}
        {r.anomalias.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
              Análise de Parâmetros ({r.anomalias.length})
            </p>
            {r.anomalias.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <span style={{ color: NIVEL_COLOR[a.nivel], fontWeight: 700, fontSize: '8pt', minWidth: '48px' }}>
                  {a.nivel === 'critico' ? '● CRÍTICO' : a.nivel === 'atencao' ? '● ATENÇÃO' : '✓ OK'}
                </span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '8.5pt' }}>{a.parametro}</span>
                  <span style={{ color: '#666', fontSize: '8pt', marginLeft: '6px', fontFamily: 'monospace' }}>{a.valor}</span>
                  <span style={{ color: '#555', fontSize: '8pt', marginLeft: '6px' }}>{a.mensagem}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GRÁFICO: Pressões */}
        {oduSamples.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
              Pressões de Operação (psi)
            </p>
            <LineChart width={680} height={150} data={oduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 7 }} width={32} />
              <Tooltip formatter={(v) => `${v} psi`} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="highPress" name="Alta" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="lowPress"  name="Sucção" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </div>
        )}

        {/* GRÁFICO: SH/SC */}
        {iduSamples.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
              Superaquecimento / Sub-resfriamento (°C)
            </p>
            <LineChart width={680} height={140} data={iduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 7 }} width={32} />
              <Tooltip formatter={(v) => `${v}°C`} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="scsh"    name="SH/SC"        stroke="#8b5cf6" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="pipeIn"  name="Tubo Entrada" stroke="#0ea5e9" strokeWidth={1}   dot={false} connectNulls />
              <Line type="monotone" dataKey="pipeOut" name="Tubo Saída"   stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls />
            </LineChart>
          </div>
        )}

        {/* GRÁFICO: Consumo + Frequência */}
        {oduSamples.length > 0 && (oduSamples[0].power !== null || oduSamples[0].freq !== null) && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', margin: '0 0 6px 0' }}>
              Consumo (kW) e Frequência do Compressor (Hz)
            </p>
            <LineChart width={680} height={140} data={oduSamples} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left"  tick={{ fontSize: 7 }} width={32} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 7 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line yAxisId="left"  type="monotone" dataKey="power" name="Consumo (kW)" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="freq"  name="Freq. (Hz)"   stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </div>
        )}

        {/* ERROS */}
        {r.errosEncontrados.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid #ddd', backgroundColor: '#fff5f5' }}>
            <p style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#b91c1c', margin: '0 0 4px 0' }}>
              Códigos de Erro Registrados
            </p>
            {r.errosEncontrados.map((e, i) => (
              <p key={i} style={{ margin: '2px 0', fontFamily: 'monospace', fontSize: '8pt', color: '#dc2626' }}>{e}</p>
            ))}
          </div>
        )}

        {/* RODAPÉ */}
        <div style={{ marginTop: '12px', paddingTop: '6px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            Diagnóstico LGMV · {eq.nome} · {nomeEmpresa}
            {config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}
          </p>
          <p style={{ fontSize: '7pt', color: '#aaa', margin: 0 }}>
            Gerado em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

      </div>
    </>
  )
}
