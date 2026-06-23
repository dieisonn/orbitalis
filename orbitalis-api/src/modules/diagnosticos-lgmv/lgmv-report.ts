import { LgmvIduData, LgmvOduData } from './lgmv-parser'

export interface Anomalia {
  nivel: 'normal' | 'atencao' | 'critico'
  parametro: string
  valor: string
  mensagem: string
}

export interface LgmvRelatorio {
  status: 'normal' | 'atencao' | 'critico'
  modo: string
  duracao: string
  totalLeituras: number
  errosEncontrados: string[]
  kpis: {
    superaquecimento?: { media: number; min: number; max: number }
    pressaoAlta?: { media: number; min: number; max: number }
    pressaoBaixa?: { media: number; min: number; max: number }
    tempDescarga?: { media: number; min: number; max: number }
    tempEvaporacao?: { media: number; min: number; max: number }
    tempCondensacao?: { media: number; min: number; max: number }
    consumo?: { media: number; min: number; max: number }
    freqCompressor?: { media: number; min: number; max: number }
    deltaT?: { media: number }
  }
  anomalias: Anomalia[]
  laudo: string
  seriesIdu: { time: string; scsh: number | null; pipeIn: number | null; pipeOut: number | null; air: number | null }[]
  seriesOdu: { time: string; highPress: number | null; lowPress: number | null; power: number | null; freq: number | null }[]
}

function stats(vals: number[]): { media: number; min: number; max: number } | undefined {
  const clean = vals.filter((v) => v !== null && isFinite(v))
  if (clean.length === 0) return undefined
  const sum = clean.reduce((a, b) => a + b, 0)
  return {
    media: Math.round((sum / clean.length) * 10) / 10,
    min: Math.round(Math.min(...clean) * 10) / 10,
    max: Math.round(Math.max(...clean) * 10) / 10,
  }
}

function skipStartup<T>(arr: T[], n = 5): T[] {
  return arr.length > n ? arr.slice(n) : arr
}

function toTime(t: string): string | null {
  if (!t) return null
  const parts = t.split(':')
  if (parts.length < 2) return null
  return t
}

function diffMinutes(t1: string, t2: string): number {
  const parse = (t: string) => {
    const [h, m, s] = t.split(':').map(Number)
    return h * 3600 + m * 60 + (s || 0)
  }
  return Math.abs(parse(t2) - parse(t1)) / 60
}

export function gerarRelatorio(idu: LgmvIduData | null, odu: LgmvOduData | null): LgmvRelatorio {
  const anomalias: Anomalia[] = []
  const erros: string[] = []
  const kpis: LgmvRelatorio['kpis'] = {}

  const allReadings = [
    ...(idu?.readings.length ? [idu.readings[0].time, idu.readings[idu.readings.length - 1].time] : []),
    ...(odu?.readings.length ? [odu.readings[0].time, odu.readings[odu.readings.length - 1].time] : []),
  ]
  const totalLeituras = (idu?.readings.length ?? 0) + (odu?.readings.length ?? 0)
  const modo = idu?.readings[0]?.operMode ?? odu?.readings[0]?.operMode ?? 'COOL'

  let duracao = '—'
  if (idu && idu.readings.length >= 2) {
    const t1 = idu.readings[0].time, t2 = idu.readings[idu.readings.length - 1].time
    const mins = diffMinutes(t1, t2)
    duracao = mins < 1 ? `${Math.round(mins * 60)} seg` : `${Math.round(mins)} min`
  } else if (odu && odu.readings.length >= 2) {
    const t1 = odu.readings[0].time, t2 = odu.readings[odu.readings.length - 1].time
    const mins = diffMinutes(t1, t2)
    duracao = mins < 1 ? `${Math.round(mins * 60)} seg` : `${Math.round(mins)} min`
  }

  // ── IDU analysis ──────────────────────────────────────
  const iduSeries: LgmvRelatorio['seriesIdu'] = []

  if (idu) {
    idu.readings.forEach((r) => {
      if (r.error && r.error.trim()) erros.push(`${r.time}: ${r.error}`)
      iduSeries.push({ time: r.time, scsh: r.scsh, pipeIn: r.pipeIn, pipeOut: r.pipeOut, air: r.air })
    })

    const stable = skipStartup(idu.readings, 5)

    // Superheat / subcooling
    const shVals = stable.map((r) => r.scsh).filter((v): v is number => v !== null)
    const shStat = stats(shVals)
    if (shStat) {
      kpis.superaquecimento = shStat
      if (shStat.media < 3) {
        anomalias.push({ nivel: 'critico', parametro: 'Superaquecimento', valor: `${shStat.media}°C`, mensagem: 'Superaquecimento muito baixo — risco de retorno de líquido ao compressor. Verificar EEV e carga de gás.' })
      } else if (shStat.media < 5) {
        anomalias.push({ nivel: 'atencao', parametro: 'Superaquecimento', valor: `${shStat.media}°C`, mensagem: 'Superaquecimento abaixo do ideal (5-8°C). Possível excesso de carga de gás ou EEV muito aberto.' })
      } else if (shStat.media > 12) {
        anomalias.push({ nivel: 'atencao', parametro: 'Superaquecimento', valor: `${shStat.media}°C`, mensagem: 'Superaquecimento alto — possível baixa carga de gás ou restrição na linha de líquido.' })
      } else {
        anomalias.push({ nivel: 'normal', parametro: 'Superaquecimento', valor: `${shStat.media}°C`, mensagem: 'Superaquecimento dentro da faixa ideal (5-8°C).' })
      }
    }

    // Delta T
    const dtVals = stable.map((r) => (r.air !== null && r.pipeOut !== null ? r.air - r.pipeOut : null)).filter((v): v is number => v !== null)
    const dtStat = stats(dtVals)
    if (dtStat) kpis.deltaT = { media: dtStat.media }
  }

  // ── ODU analysis ──────────────────────────────────────
  const oduSeries: LgmvRelatorio['seriesOdu'] = []

  if (odu) {
    odu.readings.forEach((r) => {
      if (r.error && r.error.trim()) erros.push(`${r.time}: ${r.error}`)
      oduSeries.push({ time: r.time, highPress: r.highPressTrace, lowPress: r.lowPressTrace, power: r.power, freq: r.invFreq })
    })

    const stable = skipStartup(odu.readings, 5)

    // High pressure
    const hiVals = stable.map((r) => r.highPressTrace).filter((v): v is number => v !== null && v > 150)
    const hiStat = stats(hiVals)
    if (hiStat) {
      kpis.pressaoAlta = hiStat
      if (hiStat.media > 320) {
        anomalias.push({ nivel: 'critico', parametro: 'Pressão de descarga', valor: `${hiStat.media} psi`, mensagem: 'Pressão de descarga muito alta — provável condensador sujo, obstruído ou ventilador com falha.' })
      } else if (hiStat.media > 285) {
        anomalias.push({ nivel: 'atencao', parametro: 'Pressão de descarga', valor: `${hiStat.media} psi`, mensagem: 'Pressão de descarga elevada — recomenda-se limpeza do condensador.' })
      } else if (hiStat.media < 180) {
        anomalias.push({ nivel: 'atencao', parametro: 'Pressão de descarga', valor: `${hiStat.media} psi`, mensagem: 'Pressão de descarga baixa — verificar carga de gás.' })
      } else {
        anomalias.push({ nivel: 'normal', parametro: 'Pressão de descarga', valor: `${hiStat.media} psi`, mensagem: 'Pressão de descarga normal.' })
      }
    }

    // Low pressure
    const loVals = stable.map((r) => r.lowPressTrace).filter((v): v is number => v !== null && v > 30 && v < 200)
    const loStat = stats(loVals)
    if (loStat) {
      kpis.pressaoBaixa = loStat
      if (loStat.media < 70) {
        anomalias.push({ nivel: 'critico', parametro: 'Pressão de sucção', valor: `${loStat.media} psi`, mensagem: 'Pressão de sucção muito baixa — sistema possivelmente com baixa carga de gás ou restrição.' })
      } else if (loStat.media < 90) {
        anomalias.push({ nivel: 'atencao', parametro: 'Pressão de sucção', valor: `${loStat.media} psi`, mensagem: 'Pressão de sucção abaixo do ideal para R410A (90-120 psi).' })
      } else if (loStat.media > 130) {
        anomalias.push({ nivel: 'atencao', parametro: 'Pressão de sucção', valor: `${loStat.media} psi`, mensagem: 'Pressão de sucção elevada — possível problema no evaporador ou excesso de carga.' })
      } else {
        anomalias.push({ nivel: 'normal', parametro: 'Pressão de sucção', valor: `${loStat.media} psi`, mensagem: 'Pressão de sucção normal para R410A.' })
      }
    }

    // Discharge temperature
    const dtVals = stable.map((r) => r.dischargeTemp).filter((v): v is number => v !== null)
    const dtStat = stats(dtVals)
    if (dtStat) {
      kpis.tempDescarga = dtStat
      if (dtStat.media > 115) {
        anomalias.push({ nivel: 'critico', parametro: 'Temperatura de descarga', valor: `${dtStat.media}°C`, mensagem: 'Temperatura de descarga crítica — risco imediato ao compressor. Desligar e investigar.' })
      } else if (dtStat.media > 100) {
        anomalias.push({ nivel: 'atencao', parametro: 'Temperatura de descarga', valor: `${dtStat.media}°C`, mensagem: 'Temperatura de descarga elevada — monitorar. Pode indicar baixo superaquecimento ou alta temperatura ambiente.' })
      } else {
        anomalias.push({ nivel: 'normal', parametro: 'Temperatura de descarga', valor: `${dtStat.media}°C`, mensagem: 'Temperatura de descarga dentro da faixa normal.' })
      }
    }

    // Evaporating temp
    const evapVals = stable.map((r) => r.evaporatingTemp).filter((v): v is number => v !== null)
    const evapStat = stats(evapVals)
    if (evapStat) kpis.tempEvaporacao = evapStat

    // Condensing temp
    const condVals = stable.map((r) => r.condensingTemp).filter((v): v is number => v !== null)
    const condStat = stats(condVals)
    if (condStat) kpis.tempCondensacao = condStat

    // Power
    const pwVals = stable.map((r) => r.power).filter((v): v is number => v !== null)
    const pwStat = stats(pwVals)
    if (pwStat) kpis.consumo = pwStat

    // Compressor frequency
    const frVals = stable.map((r) => r.invFreq).filter((v): v is number => v !== null)
    const frStat = stats(frVals)
    if (frStat) kpis.freqCompressor = frStat
  }

  // ── Overall status ────────────────────────────────────
  const hasCritico = anomalias.some((a) => a.nivel === 'critico')
  const hasAtencao = anomalias.some((a) => a.nivel === 'atencao')
  const status: LgmvRelatorio['status'] = hasCritico ? 'critico' : hasAtencao ? 'atencao' : 'normal'

  // ── Laudo text ────────────────────────────────────────
  const laudoParts: string[] = []

  if (status === 'normal') {
    laudoParts.push(`O equipamento está operando em condições normais no modo ${modo === 'COOL' ? 'resfriamento' : modo}.`)
  } else if (status === 'atencao') {
    laudoParts.push(`O equipamento apresenta pontos de atenção que devem ser monitorados.`)
  } else {
    laudoParts.push(`Foram identificados problemas críticos que requerem intervenção imediata.`)
  }

  const shStat = kpis.superaquecimento
  if (shStat) {
    if (shStat.media >= 5 && shStat.media <= 8) {
      laudoParts.push(`O superaquecimento médio de ${shStat.media}°C está na faixa ideal de 5 a 8°C, indicando boa regulagem do EEV e carga de gás adequada.`)
    } else {
      laudoParts.push(`O superaquecimento médio foi de ${shStat.media}°C (mín: ${shStat.min}°C, máx: ${shStat.max}°C) — faixa ideal é de 5 a 8°C.`)
    }
  }

  if (kpis.pressaoBaixa && kpis.pressaoAlta) {
    laudoParts.push(`As pressões de operação foram: sucção ${kpis.pressaoBaixa.media} psi e descarga ${kpis.pressaoAlta.media} psi.`)
  }

  if (kpis.consumo) {
    laudoParts.push(`O consumo médio de energia foi de ${kpis.consumo.media} kW.`)
  }

  const criticos = anomalias.filter((a) => a.nivel === 'critico')
  const atencoes = anomalias.filter((a) => a.nivel === 'atencao')
  if (criticos.length > 0) {
    laudoParts.push(`Problemas críticos identificados: ${criticos.map((a) => a.mensagem).join(' ')}`)
  }
  if (atencoes.length > 0) {
    laudoParts.push(`Pontos de atenção: ${atencoes.map((a) => a.mensagem).join(' ')}`)
  }

  if (erros.length > 0) {
    laudoParts.push(`Códigos de erro registrados durante a medição: ${erros.slice(0, 5).join('; ')}.`)
  }

  return {
    status,
    modo,
    duracao,
    totalLeituras,
    errosEncontrados: [...new Set(erros)],
    kpis,
    anomalias,
    laudo: laudoParts.join(' '),
    seriesIdu: iduSeries,
    seriesOdu: oduSeries,
  }
}
