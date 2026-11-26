import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Jornada padrão quando a empresa ainda não configurou: segunda a sexta, 9 h (minutos, domingo a sábado). */
export const JORNADA_PADRAO = [0, 540, 540, 540, 540, 540, 0];

const MAX_DIAS = 93;
const DIA_MS = 86_400_000;

const dia = (iso: string) => new Date(`${iso}T00:00:00-03:00`);
const isoDia = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
const somaDias = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const diaSemana = (iso: string) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay();
const hhmmParaMin = (s: string | null) => { if (!s) return null; const [h, m] = s.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

type Intervalo = [number, number];
/** Une intervalos que se tocam (para não contar duas vezes o mesmo horário da mesma O.S.). */
function unir(lista: Intervalo[]): Intervalo[] {
  const ord = [...lista].sort((a, b) => a[0] - b[0]);
  const out: Intervalo[] = [];
  for (const iv of ord) {
    const ult = out[out.length - 1];
    if (ult && iv[0] <= ult[1]) ult[1] = Math.max(ult[1], iv[1]);
    else out.push([iv[0], iv[1]]);
  }
  return out;
}
/** Minutos do intervalo [ini, fim] (ms) que caem dentro do dia `iso`. */
function minutosNoDia(ini: number, fim: number, iso: string) {
  const a = dia(iso).getTime(), b = a + DIA_MS;
  return Math.max(0, (Math.min(fim, b) - Math.max(ini, a)) / 60_000);
}

@Injectable()
export class CapacidadeService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────── Configuração ─────────

  private async semanaEmpresa(): Promise<number[]> {
    const r = await this.prisma.jornadaSemanal.findFirst({ where: { tecnicoId: null } });
    return r?.minutos?.length === 7 ? r.minutos : JORNADA_PADRAO;
  }

  async jornada() {
    const hoje = isoDia(new Date());
    const [empresa, tecnicos, semanais, ajustes] = await Promise.all([
      this.semanaEmpresa(),
      this.prisma.usuario.findMany({ where: { tipo: 'tecnico' }, select: { id: true, nome: true, email: true }, orderBy: { nome: 'asc' } }),
      this.prisma.jornadaSemanal.findMany({ where: { tecnicoId: { not: null } } }),
      this.prisma.jornadaAjuste.findMany({ where: { data: { gte: dia(somaDias(hoje, -30)) } }, orderBy: { data: 'asc' } }),
    ]);
    return {
      empresa,
      padrao: JORNADA_PADRAO,
      tecnicos: tecnicos.map((t) => ({
        id: t.id, nome: t.nome ?? t.email,
        semana: semanais.find((s) => s.tecnicoId === t.id)?.minutos ?? null,
      })),
      ajustes: ajustes.map((a) => ({ id: a.id, tecnicoId: a.tecnicoId, data: a.data.toISOString().slice(0, 10), minutos: a.minutos, motivo: a.motivo })),
    };
  }

  async definirSemanaEmpresa(semana: number[]) {
    const atual = await this.prisma.jornadaSemanal.findFirst({ where: { tecnicoId: null }, select: { id: true } });
    if (atual) await this.prisma.jornadaSemanal.update({ where: { id: atual.id }, data: { minutos: semana } });
    else await this.prisma.jornadaSemanal.create({ data: { minutos: semana } });
    return { ok: true };
  }

  async definirSemanaTecnico(tecnicoId: string, semana: number[] | null | undefined) {
    const tec = await this.prisma.usuario.findFirst({ where: { id: tecnicoId, tipo: 'tecnico' }, select: { id: true } });
    if (!tec) throw new NotFoundException('Técnico não encontrado');
    const atual = await this.prisma.jornadaSemanal.findFirst({ where: { tecnicoId }, select: { id: true } });
    if (!semana) {
      if (atual) await this.prisma.jornadaSemanal.delete({ where: { id: atual.id } });
    } else if (atual) await this.prisma.jornadaSemanal.update({ where: { id: atual.id }, data: { minutos: semana } });
    else await this.prisma.jornadaSemanal.create({ data: { tecnicoId, minutos: semana } });
    return { ok: true };
  }

  async criarAjuste(dto: { tecnicoId: string; data: string; minutos: number; motivo?: string }) {
    const tec = await this.prisma.usuario.findFirst({ where: { id: dto.tecnicoId, tipo: 'tecnico' }, select: { id: true } });
    if (!tec) throw new NotFoundException('Técnico não encontrado');
    if (Number.isNaN(dia(dto.data).getTime())) throw new BadRequestException('Data inválida');
    const data = new Date(`${dto.data}T00:00:00.000Z`);
    const existente = await this.prisma.jornadaAjuste.findFirst({ where: { tecnicoId: dto.tecnicoId, data }, select: { id: true } });
    const motivo = dto.motivo?.trim() || null;
    if (existente) return this.prisma.jornadaAjuste.update({ where: { id: existente.id }, data: { minutos: dto.minutos, motivo } });
    return this.prisma.jornadaAjuste.create({ data: { tecnicoId: dto.tecnicoId, data, minutos: dto.minutos, motivo } });
  }

  async removerAjuste(id: string) {
    const a = await this.prisma.jornadaAjuste.findFirst({ where: { id }, select: { id: true } });
    if (!a) throw new NotFoundException('Ajuste não encontrado');
    await this.prisma.jornadaAjuste.delete({ where: { id } });
    return { ok: true };
  }

  // ───────── Cálculo ─────────

  /**
   * Capacidade x programado x realizado, em horas-pessoa, de `de` a `ate` (AAAA-MM-DD, horário de Brasília).
   *  - Capacidade: soma da jornada de cada técnico no dia (jornada da empresa, da pessoa ou ajuste do dia).
   *    Com a equipe dividida em dois lugares, as horas de cada técnico somam (2 técnicos × 9 h = 18 h).
   *  - Programado: duração dos eventos de agenda das O.S. × pessoas (técnico + auxiliares). Eventos sem O.S. não contam.
   *  - Realizado: tempo entre entrada e saída registrado no fechamento da O.S. × pessoas. Só O.S. concluídas.
   */
  async calcular(deP?: string, ateP?: string) {
    const hoje = isoDia(new Date());
    const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dia(s).getTime());
    const de = ok(deP) ? deP! : hoje.slice(0, 8) + '01';
    const ate = ok(ateP) ? ateP! : hoje;
    if (ate < de) throw new BadRequestException('Período inválido');
    const dias: string[] = [];
    for (let d = de; d <= ate; d = somaDias(d, 1)) {
      dias.push(d);
      if (dias.length > MAX_DIAS) throw new BadRequestException(`Período muito longo (máximo ${MAX_DIAS} dias)`);
    }
    const ini = dia(de), fim = dia(somaDias(ate, 1));

    const [empresa, tecnicos, semanais, ajustes, oss] = await Promise.all([
      this.semanaEmpresa(),
      this.prisma.usuario.findMany({ where: { tipo: 'tecnico' }, select: { id: true, nome: true, email: true } }),
      this.prisma.jornadaSemanal.findMany({ where: { tecnicoId: { not: null } } }),
      this.prisma.jornadaAjuste.findMany({ where: { data: { gte: new Date(`${de}T00:00:00.000Z`), lte: new Date(`${ate}T00:00:00.000Z`) } } }),
      this.prisma.ordemServico.findMany({
        where: {
          status: { not: 'cancelada' },
          OR: [
            { eventos: { some: { diaInteiro: false, inicio: { lt: fim }, fim: { gt: ini } } } },
            { dataAgendamento: { gte: ini, lt: fim } },
            { status: 'concluida', dataConclusao: { gte: ini, lt: new Date(fim.getTime() + DIA_MS) } },
            { dias: { some: { data: { gte: new Date(`${de}T00:00:00.000Z`), lte: new Date(`${ate}T00:00:00.000Z`) } } } },
          ],
        },
        select: {
          id: true, status: true, tecnicoId: true, dataAgendamento: true, dataInicio: true, dataConclusao: true,
          tipoServico: { select: { duracaoMinutos: true } },
          dias: { select: { data: true, horaInicio: true, horaFim: true } },
          eventos: { select: { inicio: true, fim: true, diaInteiro: true } },
          auxiliares: { select: { tecnicoId: true } },
        },
      }),
    ]);

    const semTec = new Map(semanais.map((s) => [s.tecnicoId!, s.minutos]));
    const ajuste = new Map(ajustes.map((a) => [`${a.tecnicoId}|${a.data.toISOString().slice(0, 10)}`, a.minutos]));
    const jornadaDe = (tecId: string, iso: string) => {
      const aj = ajuste.get(`${tecId}|${iso}`);
      if (aj !== undefined) return aj;
      return (semTec.get(tecId) ?? empresa)[diaSemana(iso)] ?? 0;
    };

    type Cel = { prog: number; real: number };
    // minutos-pessoa por técnico e dia; '-' = O.S. ainda sem técnico
    const cel = new Map<string, Cel>();
    const get = (tec: string, iso: string) => { const k = `${tec}|${iso}`; let c = cel.get(k); if (!c) { c = { prog: 0, real: 0 }; cel.set(k, c); } return c; };
    const diaSet = new Set(dias);

    for (const o of oss) {
      const pessoas = Array.from(new Set([o.tecnicoId, ...o.auxiliares.map((a) => a.tecnicoId)].filter((x): x is string => !!x)));
      const alvos = pessoas.length ? pessoas : ['-'];

      // Programado
      const intervalos: Intervalo[] = o.eventos.filter((e) => !e.diaInteiro).map((e) => [e.inicio.getTime(), e.fim.getTime()]);
      const progPorDia = new Map<string, number>();
      if (intervalos.length) {
        for (const iv of unir(intervalos)) {
          for (const d of dias) {
            const m = minutosNoDia(iv[0], iv[1], d);
            if (m > 0) progPorDia.set(d, (progPorDia.get(d) ?? 0) + m);
          }
        }
      } else if ((o.tipoServico?.duracaoMinutos ?? 0) > 0) {
        const d = isoDia(o.dataAgendamento);
        if (diaSet.has(d)) progPorDia.set(d, o.tipoServico!.duracaoMinutos);
      }
      for (const [d, m] of progPorDia) for (const t of alvos) get(t, d).prog += m;

      // Realizado (só O.S. concluída)
      if (o.status !== 'concluida') continue;
      const realPorDia = new Map<string, number>();
      if (o.dias.length >= 2) {
        const partes = o.dias.map((x) => { const a = hhmmParaMin(x.horaInicio), b = hhmmParaMin(x.horaFim); return { d: x.data.toISOString().slice(0, 10), m: a !== null && b !== null && b > a ? b - a : null }; });
        if (partes.every((p) => p.m !== null)) for (const p of partes) if (diaSet.has(p.d)) realPorDia.set(p.d, (realPorDia.get(p.d) ?? 0) + p.m!);
      } else if (o.dataInicio && o.dataConclusao) {
        const total = (o.dataConclusao.getTime() - o.dataInicio.getTime()) / 60_000;
        if (total >= 1 && total <= 16 * 60) {
          for (const d of dias) {
            const m = minutosNoDia(o.dataInicio.getTime(), o.dataConclusao.getTime(), d);
            if (m > 0) realPorDia.set(d, m);
          }
        }
      }
      for (const [d, m] of realPorDia) for (const t of alvos) get(t, d).real += m;
    }

    // Consolidação por dia e por técnico
    const porTec = new Map<string, { cap: number; prog: number; real: number; dias: number }>();
    for (const t of tecnicos) porTec.set(t.id, { cap: 0, prog: 0, real: 0, dias: 0 });
    let semTecnicoProg = 0;
    const saidaDias = dias.map((d) => {
      let cap = 0, prog = 0, real = 0, capCampo = 0, emCampo = 0;
      for (const t of tecnicos) {
        const j = jornadaDe(t.id, d);
        const c = cel.get(`${t.id}|${d}`);
        const acc = porTec.get(t.id)!;
        acc.cap += j; cap += j;
        if (c && (c.prog > 0 || c.real > 0)) { prog += c.prog; real += c.real; acc.prog += c.prog; acc.real += c.real; acc.dias++; emCampo++; capCampo += j; }
      }
      const orf = cel.get(`-|${d}`);
      if (orf) { prog += orf.prog; semTecnicoProg += orf.prog; }
      return { data: d, capacidadeMin: Math.round(cap), programadoMin: Math.round(prog), realizadoMin: Math.round(real), tecnicosEmCampo: emCampo, capacidadeEmCampoMin: Math.round(capCampo) };
    });

    const soma = (k: 'capacidadeMin' | 'programadoMin' | 'realizadoMin' | 'capacidadeEmCampoMin') => saidaDias.reduce((t, x) => t + x[k], 0);
    const cap = soma('capacidadeMin'), prog = soma('programadoMin'), real = soma('realizadoMin');
    return {
      periodo: { de, ate },
      totais: {
        capacidadeMin: cap, programadoMin: prog, realizadoMin: real,
        capacidadeEmCampoMin: soma('capacidadeEmCampoMin'),
        ocupacao: pct(prog, cap),            // programado / capacidade
        aproveitamento: pct(real, cap),      // realizado / capacidade
        aderencia: pct(real, prog),          // realizado / programado
        programadoSemTecnicoMin: Math.round(semTecnicoProg),
      },
      dias: saidaDias,
      tecnicos: tecnicos
        .map((t) => { const a = porTec.get(t.id)!; return { id: t.id, nome: t.nome ?? t.email, capacidadeMin: Math.round(a.cap), programadoMin: Math.round(a.prog), realizadoMin: Math.round(a.real), diasEmCampo: a.dias, ocupacao: pct(a.prog, a.cap), aproveitamento: pct(a.real, a.cap) }; })
        .filter((t) => t.capacidadeMin > 0 || t.programadoMin > 0 || t.realizadoMin > 0)
        .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '')),
    };
  }
}
