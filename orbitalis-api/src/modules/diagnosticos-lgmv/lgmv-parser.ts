export interface LgmvIduReading {
  time: string
  operMode: string
  error: string
  air: number | null
  pipeIn: number | null
  pipeOut: number | null
  scsh: number | null
  eev: number | null
  humidity: number | null
}

export interface LgmvOduReading {
  time: string
  operMode: string
  error: string
  highPressTrace: number | null
  lowPressTrace: number | null
  suctionTemp: number | null
  condensingTemp: number | null
  evaporatingTemp: number | null
  dischargeTemp: number | null
  invFreq: number | null
  power: number | null
  current: number | null
  voltage: number | null
  airTemp: number | null
}

export interface LgmvIduData {
  type: 'IDU'
  metadata: { startTime: string; refrigerant: string }
  readings: LgmvIduReading[]
}

export interface LgmvOduData {
  type: 'ODU'
  metadata: { startTime: string; refrigerant: string }
  readings: LgmvOduReading[]
}

function num(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.trim())
  return isNaN(n) ? null : n
}

function invalidSensorValue(v: number | null): boolean {
  if (v === null) return true
  return v >= 200 || v <= -200
}

function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i].startsWith('Siter,Time,OperMode')) return i
  }
  return -1
}

export function parseLgmvCsv(raw: string): LgmvIduData | LgmvOduData | null {
  const lines = raw.split('\n').map((l) => l.replace(/\r$/, '').trimEnd())
  if (lines.length < 13) return null

  const header0 = lines[0]
  const isIdu = /IDU/i.test(header0)
  const isOdu = /ODU/i.test(header0)
  if (!isIdu && !isOdu) return null

  const startTimeMatch = header0.match(/Save Start Time:,"([^"]+)"/)
  const startTime = startTimeMatch ? startTimeMatch[1] : ''

  const sysInfo = lines[1] ?? ''
  const refMatch = sysInfo.match(/R\d{3}A/)
  const refrigerant = refMatch ? refMatch[0] : 'R410A'

  const headerIdx = findHeaderLine(lines)
  if (headerIdx === -1) return null

  const headers = lines[headerIdx].split(',')
  const idx = (name: string) => headers.findIndex((h) => h.trim() === name.trim())

  const dataLines = lines.slice(headerIdx + 1).filter((l) => l.trim() && /^\d/.test(l))

  const metadata = { startTime, refrigerant }

  if (isIdu) {
    const ti = idx('Time'), oi = idx('OperMode'), ei = idx('Error')
    const airI = idx('Air_1'), piI = idx('Pipe In_1'), poI = idx('Pipe Out_1')
    const shI = idx('SC/SH_1'), evI = idx('EEV_1'), huI = idx('Humidity_1')

    const readings: LgmvIduReading[] = dataLines.map((line) => {
      const c = line.split(',')
      const rawPipeOut = num(c[poI])
      const rawScsh   = num(c[shI])
      // LG LGMV uses -100, -65.xx and similar as "no sensor" placeholders.
      // Filter out physically impossible pipe temps (< -40°C or > 80°C) and
      // SC/SH outside the plausible HVAC range (-15 to +70°C).
      const pipeOut = rawPipeOut !== null && rawPipeOut > -40 && rawPipeOut < 80 ? rawPipeOut : null
      const scsh    = rawScsh    !== null && rawScsh    > -15 && rawScsh    < 70 ? rawScsh    : null
      return {
        time: c[ti] ?? '',
        operMode: c[oi] ?? '',
        error: c[ei] ?? '',
        air: num(c[airI]),
        pipeIn: num(c[piI]),
        pipeOut,
        scsh,
        eev: num(c[evI]),
        humidity: num(c[huI]),
      }
    }).filter((r) => r.time)

    return { type: 'IDU', metadata, readings }
  } else {
    const ti = idx('Time'), oi = idx('OperMode'), ei = idx('Error')
    const hiI = idx('HighPress Trace_M'), loI = idx('LowPress Trace_M')
    const suctI = idx('Suction Temp_M'), condI = idx('Condense Temp._M')
    const evapI = idx('Evaporate Temp._M'), discI = idx('INV1 dis.Temp._M')
    const freqI = idx('INV1 Trace_M'), powerI = idx('Consumption_M')
    const ctI = idx('INV1 input CT_M'), vtI = idx('INV1 input VT_M')
    const airI = idx('Air Temp_M')

    const readings: LgmvOduReading[] = dataLines.map((line) => {
      const c = line.split(',')
      const st = num(c[suctI])
      const dt = num(c[discI])
      return {
        time: c[ti] ?? '',
        operMode: c[oi] ?? '',
        error: c[ei] ?? '',
        highPressTrace: num(c[hiI]),
        lowPressTrace: num(c[loI]),
        suctionTemp: invalidSensorValue(st) ? null : st,
        condensingTemp: num(c[condI]),
        evaporatingTemp: num(c[evapI]),
        dischargeTemp: invalidSensorValue(dt) ? null : dt,
        invFreq: num(c[freqI]),
        power: num(c[powerI]),
        current: num(c[ctI]),
        voltage: num(c[vtI]),
        airTemp: num(c[airI]),
      }
    }).filter((r) => r.time)

    return { type: 'ODU', metadata, readings }
  }
}
