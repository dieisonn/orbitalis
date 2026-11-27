import * as ExcelJS from 'exceljs';

// Leitura/gravação de planilhas .xlsx no formato dos sistemas de gestão brasileiros:
// números como texto "9.999,00", "Sim"/"Não" e datas "dd/mm/aaaa hh:mm:ss".

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Cabeçalho comparável: sem acento, sem "*", minúsculo, espaços simples. */
export const chaveCabecalho = (s: string) => semAcento(String(s ?? '')).replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** "9.999,00" | "9999.5" | 12 → número; vazio → undefined; ilegível → NaN. */
export function lerNumeroBr(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return v;
  const t = String(v).trim().replace(/[R$\s%]/g, '');
  if (!t) return undefined;
  // com vírgula: vírgula é decimal e ponto é milhar; sem vírgula: ponto é decimal
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function lerSimNao(v: unknown): boolean | undefined {
  const t = chaveCabecalho(String(v ?? ''));
  if (!t) return undefined;
  if (['sim', 's', '1', 'true', 'ativo', 'x'].includes(t)) return true;
  if (['nao', 'n', '0', 'false', 'inativo'].includes(t)) return false;
  return undefined;
}

export const formatarNumeroBr = (n: number | string | null | undefined, casas = 2) =>
  Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function dataHoraBr(d: Date): string {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a; }, {});
  return `${p.day}/${p.month}/${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
}

export async function montarPlanilha(aba: string, cabecalho: string[], linhas: (string | null)[][], larguras?: number[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(aba);
  ws.addRow(cabecalho);
  for (const l of linhas) ws.addRow(l);
  ws.getRow(1).font = { bold: true };
  cabecalho.forEach((_, i) => { ws.getColumn(i + 1).width = larguras?.[i] ?? 18; });
  // tudo como texto: preserva zeros à esquerda em códigos e o formato "9.999,00"
  ws.eachRow((row) => row.eachCell((c) => { c.numFmt = '@'; }));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type LinhaPlanilha = { linha: number; valores: Record<string, string> };

/** Lê a primeira aba: devolve as linhas indexadas pelo cabeçalho normalizado (ver chaveCabecalho). */
export async function lerPlanilha(base64: string): Promise<{ cabecalho: string[]; linhas: LinhaPlanilha[] }> {
  const limpo = base64.replace(/^data:[^,]*,/, '');
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(limpo, 'base64') as any);
  } catch {
    throw new Error('Não foi possível ler o arquivo. Envie uma planilha .xlsx.');
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('A planilha está vazia.');
  const texto = (c: ExcelJS.CellValue): string => {
    if (c === null || c === undefined) return '';
    if (c instanceof Date) return dataHoraBr(c);
    if (typeof c === 'object') {
      const o = c as any;
      if (o.richText) return o.richText.map((r: any) => r.text).join('');
      if (o.result !== undefined) return texto(o.result);
      if (o.text !== undefined) return String(o.text);
      return '';
    }
    return String(c);
  };
  const cab = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((v) => chaveCabecalho(texto(v)));
  const linhas: LinhaPlanilha[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const valores: Record<string, string> = {};
    let algum = false;
    cab.forEach((k, i) => {
      if (!k) return;
      const t = texto(row.getCell(i + 1).value).trim();
      valores[k] = t;
      if (t) algum = true;
    });
    if (algum) linhas.push({ linha: r, valores });
  }
  return { cabecalho: cab, linhas };
}

export type ResultadoImportacao = {
  simulacao: boolean;
  total: number;
  criados: number;
  atualizados: number;
  semAlteracao: number;
  ajustesEstoque: number;
  erros: { linha: number; mensagem: string }[];
  avisos: { linha: number; mensagem: string }[];
};
export const resultadoVazio = (simulacao: boolean): ResultadoImportacao => ({
  simulacao, total: 0, criados: 0, atualizados: 0, semAlteracao: 0, ajustesEstoque: 0, erros: [], avisos: [],
});
