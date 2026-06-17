import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async exportarOs(filtros: {
    de?: string; ate?: string; status?: string; tecnicoId?: string; clienteId?: string; tipo?: string;
  }): Promise<Buffer> {
    const where: any = {};
    if (filtros.de || filtros.ate) {
      where.dataAgendamento = {};
      if (filtros.de) where.dataAgendamento.gte = new Date(filtros.de);
      if (filtros.ate) where.dataAgendamento.lte = new Date(filtros.ate + 'T23:59:59');
    }
    if (filtros.status) where.status = filtros.status;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.tecnicoId) where.tecnicoId = filtros.tecnicoId;
    if (filtros.clienteId) where.ambiente = { cliente: { id: filtros.clienteId } };

    const os = await this.prisma.ordemServico.findMany({
      where,
      orderBy: { dataAgendamento: 'asc' },
      include: {
        ambiente: { include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } } },
        tecnico: { select: { nome: true, email: true } },
        itens: { select: { statusItem: true } },
      },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Orbitalis';
    const ws = wb.addWorksheet('Ordens de Serviço');

    ws.columns = [
      { header: 'Nº', key: 'numero', width: 8 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Origem', key: 'origem', width: 22 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Ambiente', key: 'ambiente', width: 25 },
      { header: 'Técnico', key: 'tecnico', width: 22 },
      { header: 'Agendamento', key: 'dataAgendamento', width: 14 },
      { header: 'Conclusão', key: 'dataConclusao', width: 14 },
      { header: 'Equipamentos', key: 'totalItens', width: 14 },
      { header: 'M.O. (R$)', key: 'maoObra', width: 12 },
      { header: 'Peças (R$)', key: 'pecas', width: 12 },
      { header: 'Total (R$)', key: 'total', width: 12 },
    ];

    // Header style
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0505AD' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 22;

    const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR') : '';
    const fmtR = (v: any) => v != null ? Number(v).toFixed(2) : '';

    os.forEach((o, i) => {
      const mao = Number(o.valorMaoObra ?? 0);
      const peca = Number(o.valorPecas ?? 0);
      const row = ws.addRow({
        numero: o.numero != null ? `OS-${String(o.numero).padStart(4, '0')}` : o.id.slice(0, 8),
        status: o.status,
        tipo: o.tipo,
        origem: o.origem.replace(/_/g, ' '),
        cliente: o.ambiente.cliente.nomeFantasia ?? o.ambiente.cliente.razaoSocial,
        ambiente: o.ambiente.nome,
        tecnico: o.tecnico ? (o.tecnico.nome ?? o.tecnico.email) : '—',
        dataAgendamento: fmt(o.dataAgendamento),
        dataConclusao: fmt(o.dataConclusao),
        totalItens: o.itens.length,
        maoObra: fmtR(o.valorMaoObra),
        pecas: fmtR(o.valorPecas),
        total: (mao + peca).toFixed(2),
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        });
      }
    });

    ws.autoFilter = { from: 'A1', to: 'M1' };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // GET /relatorios/pmoc/:clienteId (§API §US05)
  // Compila todos os checklists executados do mês/ano para o cliente
  // e retorna estrutura pronta para geração de PDF (PMOC)
  async pmoc(clienteId: string, mes: number, ano: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const ambientes = await this.prisma.ambiente.findMany({
      where: { clienteId },
      include: {
        equipamentos: true,
        ordensServico: {
          where: {
            status: 'concluida',
            dataConclusao: { gte: inicio, lte: fim },
          },
          include: {
            tecnico: { select: { email: true } },
            itens: { include: { equipamento: true } },
          },
        },
      },
    });

    // Estrutura retornada é consumida pelo serviço de geração de PDF
    // A geração do PDF em si depende de biblioteca a escolher (pdfkit, puppeteer, etc.)
    // e será implementada quando a stack de relatórios for definida.
    return {
      cliente: {
        id: cliente.id,
        razaoSocial: cliente.razaoSocial,
        documento: cliente.documento,
        endereco: cliente.endereco,
      },
      periodo: { mes, ano },
      ambientes: ambientes.map((amb) => ({
        id: amb.id,
        nome: amb.nome,
        metrosQuadrados: amb.metrosQuadrados,
        capacidadeTermica: amb.capacidadeTermica,
        ordensServico: amb.ordensServico,
      })),
    };
  }
}
