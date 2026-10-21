import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoFeriado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { feriadosNacionais } from './feriados-nacionais';
import { relogioLocal } from '../agenda/agenda-tempo';

export type FeriadoDto = {
  data: string;                       // YYYY-MM-DD
  nome: string;
  tipo: 'nacional' | 'facultativo' | TipoFeriado;
  id?: string;                        // só nos cadastrados pela empresa
  recorrente?: boolean;
  lancado?: boolean;                  // já existe um evento FE (feriado) na agenda nesse dia
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Confere se a string é uma data real (rejeita 2026-02-31). */
function dataValida(s: string): { y: number; m: number; d: number } | null {
  const m = ISO.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d } : null;
}

@Injectable()
export class FeriadosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Feriados do ano: nacionais calculados + os cadastrados pela empresa (recorrentes entram em todo ano). */
  async listar(ano: number): Promise<FeriadoDto[]> {
    if (!Number.isInteger(ano) || ano < 1970 || ano > 2100) throw new BadRequestException('Ano inválido');

    const inicio = new Date(Date.UTC(ano, 0, 1));
    const fim = new Date(Date.UTC(ano + 1, 0, 1));
    const cadastrados = await this.prisma.feriadoEmpresa.findMany({
      where: { OR: [{ data: { gte: inicio, lt: fim } }, { recorrente: true }] },
      orderBy: { data: 'asc' },
    });

    const proprios: FeriadoDto[] = [];
    for (const f of cadastrados) {
      const mes = f.data.getUTCMonth() + 1, dia = f.data.getUTCDate();
      // recorrente: mesmo dia/mês em qualquer ano (29/02 só aparece em ano bissexto)
      const quando = f.recorrente ? `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : f.data.toISOString().slice(0, 10);
      if (!dataValida(quando)) continue;
      if (!f.recorrente && (f.data < inicio || f.data >= fim)) continue;
      proprios.push({ id: f.id, data: quando, nome: f.nome, tipo: f.tipo, recorrente: f.recorrente });
    }

    // Dias em que a agenda já tem um evento de feriado (tipo FE, ou título "FE - …")
    const eventos = await this.prisma.eventoAgenda.findMany({
      where: {
        diaInteiro: true,
        // folga de 1 dia nas pontas: o instante é UTC e o dia da agenda é o de São Paulo
        inicio: { gte: new Date(inicio.getTime() - 86_400_000), lt: new Date(fim.getTime() + 86_400_000) },
        OR: [{ tipoServico: { sigla: 'FE' } }, { titulo: { startsWith: 'FE -' } }],
      },
      select: { inicio: true },
    });
    const lancados = new Set(eventos.map((e) => relogioLocal(e.inicio).dia.toISOString().slice(0, 10)));

    return [...feriadosNacionais(ano), ...proprios].map((f) => ({ ...f, lancado: lancados.has(f.data) })).sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
  }

  async criar(dto: { data: string; nome: string; tipo: TipoFeriado; recorrente?: boolean }) {
    const q = dataValida(dto.data ?? '');
    if (!q) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
    const nome = (dto.nome ?? '').trim();
    if (nome.length < 2 || nome.length > 150) throw new BadRequestException('O nome deve ter entre 2 e 150 caracteres');
    if (!Object.values(TipoFeriado).includes(dto.tipo)) throw new BadRequestException('Tipo de feriado inválido');

    const data = new Date(Date.UTC(q.y, q.m - 1, q.d));
    const existe = await this.prisma.feriadoEmpresa.findFirst({ where: { data, nome } });
    if (existe) throw new BadRequestException('Esse feriado já está cadastrado');

    const f = await this.prisma.feriadoEmpresa.create({
      data: { data, nome, tipo: dto.tipo, recorrente: !!dto.recorrente },
    });
    return { id: f.id, data: dto.data, nome: f.nome, tipo: f.tipo, recorrente: f.recorrente };
  }

  async remover(id: string) {
    const f = await this.prisma.feriadoEmpresa.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Feriado não encontrado');
    await this.prisma.feriadoEmpresa.delete({ where: { id } });
    return { ok: true };
  }
}
