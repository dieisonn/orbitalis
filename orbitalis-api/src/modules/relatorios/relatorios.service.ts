import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

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
