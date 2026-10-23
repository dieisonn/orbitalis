'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import { textoSobre } from '@/lib/cor'

export type Config = {
  nomeEmpresa: string; nomeFantasia: string | null; logoUrl: string | null; corPrimaria: string | null
  cnpj: string | null; telefone: string | null; endereco: string | null
} | null

type Tipo = { id: string; sigla: string; nome: string; corHex: string } | null
type Visita = {
  data: string
  situacao: 'prevista' | 'aberta' | 'agendada' | 'em_andamento' | 'concluida'
  osId: string | null; osNumero: number | null
  tipoServico: Tipo; tecnico: string | null
  ambientes: { nome: string; equipamentos: string[] }[]
}
export type DadosCalendario = {
  contrato: {
    id: string; descricao: string; vigenciaInicio: string; vigenciaFim: string; numOsIncluidas: number | null
    cliente: { id: string; razaoSocial: string; nomeFantasia: string | null }
  }
  ano: number
  anosDaVigencia: number[]
  visitas: Visita[]
  feriados: { data: string; nome: string; tipo: string }[]
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const SITUACAO: Record<Visita['situacao'], string> = {
  prevista: 'Prevista', aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em andamento', concluida: 'Concluída',
}
const COR_FERIADO_NACIONAL = '#C2410C'
const COR_FERIADO_LOCAL = '#08701F'
const COR_SEM_TIPO = '#223A8A'
const RESERVA = ['#223a8a', '#8e24aa', '#0b8043', '#e67c73', '#039be5', '#c0ca33', '#f4511e', '#616161']

const pad = (n: number) => String(n).padStart(2, '0')
const chave = (ano: number, mes: number, dia: number) => `${ano}-${pad(mes + 1)}-${pad(dia)}`
const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
// vigência vem como instante UTC de meia-noite: formata sem deslocar de fuso
const fmtVigencia = (s: string) => fmtData(s.slice(0, 10))
const diaSemana = (iso: string) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(iso + 'T00:00:00Z').getUTCDay()]

export function CalendarioContrato({ dados, config }: { dados: DadosCalendario; config?: Config }) {
  const { contrato, ano, visitas, feriados, anosDaVigencia } = dados
  const nomeEmpresa = config?.nomeFantasia ?? config?.nomeEmpresa ?? 'Orbitalis'
  const cor = config?.corPrimaria ?? COR_SEM_TIPO
  const cliente = contrato.cliente.nomeFantasia ?? contrato.cliente.razaoSocial

  // Dia → visitas e feriados
  const porDia = new Map<string, Visita[]>()
  for (const v of visitas) porDia.set(v.data, [...(porDia.get(v.data) ?? []), v])
  const feriadoDo = new Map<string, { nome: string; local: boolean }>()
  for (const f of feriados) {
    const local = !(f.tipo === 'nacional' || f.tipo === 'facultativo')
    const atual = feriadoDo.get(f.data)
    if (!atual || (atual.local && !local)) feriadoDo.set(f.data, { nome: f.nome, local })
  }

  // Legenda: só os tipos que aparecem neste ano
  // Cada tipo precisa de uma cor própria no papel: se dois tipos compartilham a cor, o segundo recebe outra
  const corDoTipo = new Map<string, string>()
  const tipos = new Map<string, { nome: string; cor: string }>()
  const usadas = new Set<string>()
  for (const v of visitas) {
    const k = v.tipoServico?.id ?? 'sem'
    if (tipos.has(k)) continue
    let c = (v.tipoServico?.corHex ?? COR_SEM_TIPO).toLowerCase()
    if (usadas.has(c)) c = RESERVA.find((r) => !usadas.has(r)) ?? c
    usadas.add(c)
    corDoTipo.set(k, c)
    tipos.set(k, { nome: v.tipoServico?.nome ?? 'Visitas do contrato', cor: c })
  }
  const temNacional = feriados.some((f) => f.tipo === 'nacional' || f.tipo === 'facultativo')
  const temLocal = feriados.some((f) => !(f.tipo === 'nacional' || f.tipo === 'facultativo'))
  const corDaVisita = (v: Visita) => corDoTipo.get(v.tipoServico?.id ?? 'sem') ?? COR_SEM_TIPO

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 8mm 10mm; }
        @media print { .no-print { display: none !important; } html, body { margin: 0; background: #fff !important; height: auto !important; min-height: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { margin: 0; font-family: Arial, sans-serif; }
        * { box-sizing: border-box; }
        .quebra { break-before: page; }
        .linha-visita { break-inside: avoid; }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
        <Link href={`/contratos/${contrato.id}`} className="text-sm text-gray-600 hover:text-gray-900 font-medium">← Voltar ao contrato</Link>
        <div className="flex items-center gap-3">
          {anosDaVigencia.length > 1 && (
            <nav aria-label="Ano do calendário" className="flex items-center gap-1">
              {anosDaVigencia.map((a) => (
                <a key={a} href={`?ano=${a}`} aria-current={a === ano ? 'page' : undefined}
                  className={`px-2.5 py-1 text-sm rounded-md ${a === ano ? 'bg-gray-900 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {a}
                </a>
              ))}
            </nav>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ backgroundColor: '#1f2937' }}>
            <Printer size={14} aria-hidden="true" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      <div style={{ color: '#111', background: '#fff', maxWidth: '277mm', margin: '0 auto' }}>
        {/* Página 1 — calendário */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '4px 0 6px' }}>
          <div style={{ minWidth: '60mm' }}>
            {config?.logoUrl
              ? <img src={config.logoUrl} alt={nomeEmpresa} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
              : <span style={{ fontWeight: 900, fontSize: '18pt', color: cor }}>{nomeEmpresa.toUpperCase()}</span>}
          </div>
          <h1 style={{ margin: 0, fontSize: '28pt', letterSpacing: '6px', color: cor, fontWeight: 700 }}>CALENDÁRIO {ano}</h1>
          <div style={{ minWidth: '60mm', textAlign: 'right', fontSize: '8.5pt', lineHeight: 1.4, color: '#262626' }}>
            <strong style={{ fontSize: '10pt' }}>{cliente}</strong><br />
            {contrato.descricao}<br />
            Vigência {fmtVigencia(contrato.vigenciaInicio)} a {fmtVigencia(contrato.vigenciaFim)}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 22px', padding: '6px 14px 0' }}>
          {MESES.map((nome, m) => {
            const primeiro = new Date(Date.UTC(ano, m, 1)).getUTCDay()
            const dias = new Date(Date.UTC(ano, m + 1, 0)).getUTCDate()
            const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)]
            while (celulas.length % 7) celulas.push(null)
            return (
              <section key={nome} aria-label={`${nome} de ${ano}`}>
                <h2 style={{ margin: '0 0 3px', textAlign: 'center', fontSize: '12pt', fontWeight: 400, color: cor }}>{nome}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #333', paddingBottom: '2px', marginBottom: '2px' }}>
                  {SEMANA.map((s, i) => (
                    <span key={i} style={{ textAlign: 'center', fontSize: '7.5pt', color: i === 0 ? cor : '#111' }}>{s}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '2px' }}>
                  {celulas.map((d, i) => {
                    if (d === null) return <span key={i} style={{ height: '14px' }} />
                    const k = chave(ano, m, d)
                    const vs = porDia.get(k)
                    const fer = feriadoDo.get(k)
                    const domingo = i % 7 === 0
                    const fundo = vs ? corDaVisita(vs[0]) : undefined
                    const textoCor = fundo ? textoSobre(fundo) : fer ? (fer.local ? COR_FERIADO_LOCAL : COR_FERIADO_NACIONAL) : domingo ? cor : '#111'
                    const titulo = [fer?.nome, ...(vs ?? []).map((v) => v.tipoServico?.nome ?? 'Visita')].filter(Boolean).join(' · ')
                    return (
                      <span key={i} title={titulo || undefined}
                        style={{
                          textAlign: 'center', fontSize: '8pt', lineHeight: '14px', height: '14px', borderRadius: '4px',
                          background: fundo, color: textoCor, fontWeight: vs || fer ? 700 : 400,
                          outline: vs && fer ? `1.5px solid ${fer.local ? COR_FERIADO_LOCAL : COR_FERIADO_NACIONAL}` : undefined, outlineOffset: '-1.5px',
                        }}>
                        {d}
                      </span>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <ul aria-label="Legenda" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 22px', listStyle: 'none', margin: '10px 0 0', padding: 0, fontSize: '8pt' }}>
          {temNacional && <Legenda cor={COR_FERIADO_NACIONAL} texto="Feriados nacionais" redondo />}
          {temLocal && <Legenda cor={COR_FERIADO_LOCAL} texto="Feriados municipais e da empresa" redondo />}
          {[...tipos.values()].map((t) => <Legenda key={t.nome} cor={t.cor} texto={t.nome} />)}
        </ul>
        <p style={{ textAlign: 'center', fontSize: '7pt', color: '#595959', margin: '6px 0 0' }}>
          As datas são previsões do plano de manutenção e podem ser reagendadas de comum acordo com o cliente.
        </p>

        {/* Página 2 — o que será feito */}
        <section className="quebra" aria-label="Detalhamento das visitas" style={{ paddingTop: '4px' }}>
          <h2 style={{ margin: '0 0 2px', fontSize: '15pt', color: cor }}>O que será feito em {ano}</h2>
          <p style={{ margin: '0 0 8px', fontSize: '8.5pt', color: '#404040' }}>
            {cliente} · {contrato.descricao}
          </p>
          {visitas.length === 0 ? (
            <p style={{ fontSize: '10pt', color: '#404040' }}>
              Nenhuma visita neste ano. Vincule planos preventivos a este contrato (campo “Contrato atendido”) para que as visitas apareçam aqui.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #111' }}>
                  <th scope="col" style={{ padding: '4px 6px', width: '24mm' }}>Data</th>
                  <th scope="col" style={{ padding: '4px 6px', width: '48mm' }}>Serviço</th>
                  <th scope="col" style={{ padding: '4px 6px' }}>Ambientes e equipamentos</th>
                  <th scope="col" style={{ padding: '4px 6px', width: '38mm' }}>Técnico</th>
                  <th scope="col" style={{ padding: '4px 6px', width: '30mm' }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v, i) => (
                  <tr key={`${v.data}-${v.osId ?? i}`} className="linha-visita" style={{ borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                    <td style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>{fmtData(v.data)} <span style={{ color: '#595959' }}>{diaSemana(v.data)}</span></td>
                    <td style={{ padding: '5px 6px' }}>
                      <span aria-hidden="true" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: corDaVisita(v), marginRight: '6px' }} />
                      {v.tipoServico?.nome ?? 'Visita do contrato'}
                    </td>
                    <td style={{ padding: '5px 6px' }}>
                      {v.ambientes.length === 0 ? '—' : v.ambientes.map((a) => (
                        <div key={a.nome}><strong>{a.nome}</strong>{a.equipamentos.length ? `: ${a.equipamentos.join(', ')}` : ''}</div>
                      ))}
                    </td>
                    <td style={{ padding: '5px 6px' }}>{v.tecnico ?? '—'}</td>
                    <td style={{ padding: '5px 6px' }}>{SITUACAO[v.situacao]}{v.osNumero != null ? ` · O.S. ${v.osNumero}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: '10px', fontSize: '7.5pt', color: '#595959' }}>
            {nomeEmpresa}{config?.cnpj ? ` · CNPJ ${config.cnpj}` : ''}{config?.telefone ? ` · ${config.telefone}` : ''}{config?.endereco ? ` · ${config.endereco}` : ''}
          </p>
        </section>
      </div>
    </>
  )
}

function Legenda({ cor, texto, redondo }: { cor: string; texto: string; redondo?: boolean }) {
  return (
    <li style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span aria-hidden="true" style={{ width: '10px', height: '10px', background: cor, borderRadius: redondo ? '50%' : '3px', display: 'inline-block' }} />
      {texto}
    </li>
  )
}
