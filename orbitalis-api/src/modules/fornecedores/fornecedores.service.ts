import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarCpfCnpj } from '../../common/documento';
import { CreateFornecedorDto, LoteFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';
import { dataHoraBr, lerPlanilha, lerSimNao, montarPlanilha, ResultadoImportacao, resultadoVazio, semAcento } from '../../common/planilha';

// Mesmo layout do sistema de referência (Gestão Click)
export const CABECALHO_EXPORTACAO_FORNECEDORES = ['Código', 'Tipo', 'Nome/Nome fantasia', 'CPF', 'RG', 'Data de nascimento', 'Razão social', 'CNPJ', 'I.E.', 'I.M.', 'Ativo', 'Telefone', 'Celular', 'E-mail', 'Cadastrado em'];
export const CABECALHO_MODELO_FORNECEDORES = ['Nome do fornecedor / Nome Fantasia *', 'Razão social', 'CPF/CNPJ', 'I.E.', 'E-mail', 'Telefone', 'Celular', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'Observações'];
const MAX_LINHAS_IMPORTACAO = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// string vazia → null (limpa o campo); undefined → não mexe
const vazioNulo = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  private filtro(q?: string, ativo?: string): Prisma.FornecedorWhereInput {
    const termo = q?.trim();
    return {
      deletedAt: null,
      ...(ativo === 'true' ? { ativo: true } : ativo === 'false' ? { ativo: false } : {}),
      ...(termo
        ? {
            OR: [
              { razaoSocial: { contains: termo, mode: 'insensitive' } },
              { nomeFantasia: { contains: termo, mode: 'insensitive' } },
              { cpfCnpj: { contains: termo.replace(/\D/g, '') || '§', mode: 'insensitive' } },
              { cidade: { contains: termo, mode: 'insensitive' } },
              { contato: { contains: termo, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private static readonly COM_PRODUTOS = { _count: { select: { produtos: { where: { deletedAt: null } } } } } as const;

  listar(q?: string, ativo?: string) {
    return this.prisma.fornecedor.findMany({ where: this.filtro(q, ativo), orderBy: { razaoSocial: 'asc' }, take: 5000, include: FornecedoresService.COM_PRODUTOS });
  }

  /** Página de resultados (limite 10–200). */
  async listarPaginado(q: string | undefined, ativo: string | undefined, pagina: number, limite: number) {
    const lim = Math.min(Math.max(Math.floor(limite) || 50, 10), 200);
    const pag = Math.max(Math.floor(pagina) || 1, 1);
    const where = this.filtro(q, ativo);
    const [total, itens] = await Promise.all([
      this.prisma.fornecedor.count({ where }),
      this.prisma.fornecedor.findMany({ where, orderBy: [{ razaoSocial: 'asc' }, { id: 'asc' }], skip: (pag - 1) * lim, take: lim, include: FornecedoresService.COM_PRODUTOS }),
    ]);
    return { itens, total, pagina: pag, limite: lim };
  }

  async buscar(id: string) {
    const f = await this.prisma.fornecedor.findFirst({ where: { id, deletedAt: null } });
    if (!f) throw new NotFoundException('Fornecedor não encontrado');
    return f;
  }

  private documento(valor: string | undefined, tipo: 'F' | 'J'): string | null | undefined {
    if (valor === undefined) return undefined;
    try {
      return normalizarCpfCnpj(valor, tipo);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private async garantirDocumentoLivre(cpfCnpj: string | null | undefined, ignorarId?: string) {
    if (!cpfCnpj) return;
    const outro = await this.prisma.fornecedor.findFirst({
      where: { cpfCnpj, deletedAt: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      select: { razaoSocial: true },
    });
    if (outro) throw new ConflictException(`Documento já cadastrado no fornecedor "${outro.razaoSocial}"`);
  }

  async criar(dto: CreateFornecedorDto) {
    const tipoPessoa = dto.tipoPessoa ?? 'J';
    const cpfCnpj = this.documento(dto.cpfCnpj, tipoPessoa) ?? null;
    await this.garantirDocumentoLivre(cpfCnpj);
    return this.prisma.fornecedor.create({
      data: {
        tipoPessoa,
        razaoSocial: dto.razaoSocial.trim(),
        nomeFantasia: vazioNulo(dto.nomeFantasia),
        cpfCnpj,
        inscricaoEstadual: vazioNulo(dto.inscricaoEstadual),
        inscricaoMunicipal: vazioNulo(dto.inscricaoMunicipal),
        rg: vazioNulo(dto.rg),
        dataNascimento: dto.dataNascimento === undefined ? undefined : dto.dataNascimento === '' ? null : new Date(dto.dataNascimento),
        email: vazioNulo(dto.email),
        telefone: vazioNulo(dto.telefone),
        celular: vazioNulo(dto.celular),
        contato: vazioNulo(dto.contato),
        cep: vazioNulo(dto.cep),
        logradouro: vazioNulo(dto.logradouro),
        numeroEndereco: vazioNulo(dto.numeroEndereco),
        complemento: vazioNulo(dto.complemento),
        bairro: vazioNulo(dto.bairro),
        cidade: vazioNulo(dto.cidade),
        uf: vazioNulo(dto.uf)?.toUpperCase(),
        observacoes: vazioNulo(dto.observacoes),
      },
    });
  }

  async atualizar(id: string, dto: UpdateFornecedorDto) {
    const atual = await this.buscar(id);
    const tipoPessoa = dto.tipoPessoa ?? (atual.tipoPessoa as 'F' | 'J');
    // trocar o tipo revalida o documento já gravado
    const cpfCnpj = this.documento(dto.cpfCnpj ?? (dto.tipoPessoa ? (atual.cpfCnpj ?? '') : undefined), tipoPessoa);
    await this.garantirDocumentoLivre(cpfCnpj, id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: {
        tipoPessoa: dto.tipoPessoa,
        razaoSocial: dto.razaoSocial?.trim(),
        nomeFantasia: vazioNulo(dto.nomeFantasia),
        cpfCnpj,
        inscricaoEstadual: vazioNulo(dto.inscricaoEstadual),
        inscricaoMunicipal: vazioNulo(dto.inscricaoMunicipal),
        rg: vazioNulo(dto.rg),
        dataNascimento: dto.dataNascimento === undefined ? undefined : dto.dataNascimento === '' ? null : new Date(dto.dataNascimento),
        email: vazioNulo(dto.email),
        telefone: vazioNulo(dto.telefone),
        celular: vazioNulo(dto.celular),
        contato: vazioNulo(dto.contato),
        cep: vazioNulo(dto.cep),
        logradouro: vazioNulo(dto.logradouro),
        numeroEndereco: vazioNulo(dto.numeroEndereco),
        complemento: vazioNulo(dto.complemento),
        bairro: vazioNulo(dto.bairro),
        cidade: vazioNulo(dto.cidade),
        uf: vazioNulo(dto.uf)?.toUpperCase(),
        observacoes: vazioNulo(dto.observacoes),
        ativo: dto.ativo,
      },
    });
  }

  /** Exclusão lógica; o histórico de estoque e os produtos continuam apontando para o registro. */
  async excluir(id: string) {
    await this.buscar(id);
    await this.prisma.fornecedor.update({ where: { id }, data: { deletedAt: new Date(), ativo: false, cpfCnpj: null } });
    return { ok: true };
  }

  // ---------- ações em lote
  async executarLote(dto: LoteFornecedorDto) {
    let ids: string[];
    if (dto.ids?.length) {
      ids = (await this.prisma.fornecedor.findMany({ where: { id: { in: dto.ids }, deletedAt: null }, select: { id: true } })).map((r) => r.id);
    } else if (dto.filtro) {
      ids = (await this.prisma.fornecedor.findMany({ where: this.filtro(dto.filtro.q, dto.filtro.ativo), select: { id: true }, take: 5001 })).map((r) => r.id);
    } else throw new BadRequestException('Selecione ao menos um fornecedor');
    if (ids.length === 0) throw new BadRequestException('Nenhum fornecedor encontrado na seleção');
    if (ids.length > 5000) throw new BadRequestException('Seleção acima de 5000 fornecedores. Refine a busca.');
    const data: Prisma.FornecedorUpdateManyMutationInput =
      dto.acao === 'excluir' ? { deletedAt: new Date(), ativo: false, cpfCnpj: null } : { ativo: dto.acao === 'ativar' };
    const r = await this.prisma.fornecedor.updateMany({ where: { id: { in: ids } }, data });
    return { acao: dto.acao, afetados: r.count, ignorados: 0 };
  }

  // ---------- exportação / importação (.xlsx)
  private formatarDoc(f: { cpfCnpj: string | null; tipoPessoa: string }) {
    const d = f.cpfCnpj ?? '';
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return d;
  }

  private dataBr(d: Date | null) {
    return d ? `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}` : '';
  }

  async exportar(): Promise<Buffer> {
    const lista = await this.prisma.fornecedor.findMany({ where: { deletedAt: null }, orderBy: { razaoSocial: 'asc' } });
    const linhas = lista.map((f) => {
      const pf = f.tipoPessoa === 'F';
      return [
        String(f.numero), pf ? 'PF' : 'PJ', f.nomeFantasia || f.razaoSocial, pf ? this.formatarDoc(f) : '', f.rg ?? '', this.dataBr(f.dataNascimento),
        f.razaoSocial, pf ? '' : this.formatarDoc(f), f.inscricaoEstadual ?? '', f.inscricaoMunicipal ?? '', f.ativo ? 'Sim' : 'Não',
        f.telefone ?? '', f.celular ?? '', f.email ?? '', dataHoraBr(f.criadoEm),
      ];
    });
    return montarPlanilha('Worksheet', CABECALHO_EXPORTACAO_FORNECEDORES, linhas, [10, 8, 36, 18, 14, 18, 36, 20, 16, 12, 8, 16, 16, 28, 20]);
  }

  modeloImportacao(): Promise<Buffer> {
    return montarPlanilha(
      'Fornecedores',
      CABECALHO_MODELO_FORNECEDORES,
      [
        ['Distribuidora Silva', 'Distribuidora Silva Comércio Ltda', '23.456.789/0001-95', '0623456780013', 'vendas@distsilva.com.br', '(31) 3555-2020', '(31) 98888-1111', '30411-000', 'Rua Platina', '320', 'Galpão 1', 'Prado', 'Belo Horizonte', 'MG', 'Entrega às terças'],
        ['João Transportes', '', '111.444.777-35', '', 'joao.transportes@email.com', '', '(41) 99777-6655', '80010-000', 'Rua XV de Novembro', '700', 'Sala 5', 'Centro', 'Curitiba', 'PR', 'Frete fracionado'],
      ],
      [36, 36, 20, 16, 28, 16, 16, 12, 30, 8, 16, 18, 18, 8, 30],
    );
  }

  /**
   * Importa a planilha (simular = só valida). Casa pelo CPF/CNPJ; sem documento, pelo Código (número do cadastro).
   * Existente → atualiza só as colunas preenchidas; senão cria.
   */
  async importar(arquivoBase64: string, simular: boolean): Promise<ResultadoImportacao> {
    let planilha;
    try { planilha = await lerPlanilha(arquivoBase64); } catch (e) { throw new BadRequestException((e as Error).message); }
    const res = resultadoVazio(simular);
    const colNome = planilha.cabecalho.find((c) => c.startsWith('nome do fornecedor') || c === 'nome/nome fantasia' || c === 'nome fantasia' || c === 'razao social');
    if (!colNome) {
      throw new BadRequestException('Cabeçalho não reconhecido: a planilha precisa da coluna "Nome do fornecedor / Nome Fantasia". Use o modelo de importação.');
    }
    if (planilha.linhas.length > MAX_LINHAS_IMPORTACAO) throw new BadRequestException(`Limite de ${MAX_LINHAS_IMPORTACAO} linhas por importação.`);
    res.total = planilha.linhas.length;

    const existentes = await this.prisma.fornecedor.findMany({ where: { deletedAt: null } });
    const porDoc = new Map(existentes.filter((f) => f.cpfCnpj).map((f) => [f.cpfCnpj as string, f]));
    const porNumero = new Map(existentes.map((f) => [String(f.numero), f]));
    const porNome = new Map(existentes.map((f) => [f.razaoSocial.toLowerCase(), f]));
    const vistos = new Set<string>();
    const lim = (t: string | undefined, n: number) => (t ? t.trim().slice(0, n) : undefined);

    for (const l of planilha.linhas) {
      const v = l.valores;
      const erro = (mensagem: string) => res.erros.push({ linha: l.linha, mensagem });
      const nomeFantasia = (v[colNome] || v['nome fantasia'] || '').trim();
      const razao = (v['razao social'] || nomeFantasia).trim();
      if (razao.length < 2) { erro('Nome do fornecedor é obrigatório (mínimo 2 letras).'); continue; }
      if (razao.length > 255 || nomeFantasia.length > 255) { erro('Nome muito longo (máximo 255 caracteres).'); continue; }

      const docBruto = (v['cpf/cnpj'] || v['cnpj'] || v['cpf'] || '').trim();
      const digitos = docBruto.replace(/\D/g, '');
      const tipoTxt = semAcento(v['tipo'] || v['tipo de pessoa'] || '').toLowerCase();
      const tipo: 'F' | 'J' = tipoTxt.startsWith('f') || tipoTxt === 'pf' ? 'F' : tipoTxt.startsWith('j') || tipoTxt === 'pj' ? 'J' : digitos.length === 11 ? 'F' : 'J';
      let cpfCnpj: string | null | undefined;
      if (docBruto) {
        try { cpfCnpj = normalizarCpfCnpj(docBruto, tipo); } catch (e) { erro((e as Error).message); continue; }
        if (cpfCnpj) {
          if (vistos.has(cpfCnpj)) { erro(`Documento ${docBruto} repetido na planilha.`); continue; }
          vistos.add(cpfCnpj);
        }
      }
      let dataNascimento: Date | undefined;
      const nasc = (v['data de nascimento'] || '').trim();
      if (nasc) {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(nasc) ?? /^(\d{4})-(\d{2})-(\d{2})/.exec(nasc);
        const [dd, mm, aa] = !m ? [0, 0, 0] : m[1].length === 4 ? [Number(m[3]), Number(m[2]), Number(m[1])] : [Number(m[1]), Number(m[2]), Number(m[3])];
        const dt = new Date(Date.UTC(aa, mm - 1, dd));
        if (!m || dt.getUTCDate() !== dd || dt.getUTCMonth() !== mm - 1) { erro(`Data de nascimento inválida: ${nasc}`); continue; }
        dataNascimento = dt;
      }
      const email = lim(v['e-mail'] || v['email'], 255);
      if (email && !EMAIL.test(email)) { erro(`E-mail inválido: ${email}`); continue; }
      const ufTxt = (v['estado'] || v['uf'] || '').trim();
      if (ufTxt && !/^[A-Za-z]{2}$/.test(ufTxt)) { erro('UF deve ter 2 letras.'); continue; }
      const ativoTxt = v['ativo']; const ativo = lerSimNao(ativoTxt);
      if (ativoTxt && ativo === undefined) { erro('Coluna Ativo deve ser "Sim" ou "Não".'); continue; }

      const dados = {
        razaoSocial: razao,
        nomeFantasia: nomeFantasia && nomeFantasia !== razao ? nomeFantasia.slice(0, 255) : undefined,
        tipoPessoa: docBruto || v['tipo'] || v['tipo de pessoa'] ? tipo : undefined,
        cpfCnpj: cpfCnpj || undefined,
        inscricaoEstadual: lim(v['i.e.'] || v['inscricao estadual'], 30),
        inscricaoMunicipal: lim(v['i.m.'], 30),
        rg: lim(v['rg'], 30),
        dataNascimento,
        email,
        telefone: lim(v['telefone'], 30),
        celular: lim(v['celular'], 30),
        contato: lim(v['contato'], 120),
        cep: lim(v['cep'], 9),
        logradouro: lim(v['endereco'] || v['logradouro'], 255),
        numeroEndereco: lim(v['numero'], 20),
        complemento: lim(v['complemento'], 120),
        bairro: lim(v['bairro'], 120),
        cidade: lim(v['cidade'], 120),
        uf: ufTxt ? ufTxt.toUpperCase() : undefined,
        observacoes: v['observacoes'] ? v['observacoes'].trim() : undefined,
        ativo,
      };
      const atual = (cpfCnpj ? porDoc.get(cpfCnpj) : undefined)
        ?? (!docBruto && v['codigo'] ? porNumero.get(v['codigo'].trim()) : undefined)
        ?? (!docBruto && !v['codigo'] ? porNome.get(razao.toLowerCase()) : undefined);
      try {
        if (atual) {
          const igual = (Object.keys(dados) as (keyof typeof dados)[]).every((k) => dados[k] === undefined || (atual as any)[k] === dados[k]);
          if (igual) { res.semAlteracao++; continue; }
          if (!simular) await this.prisma.fornecedor.update({ where: { id: atual.id }, data: dados });
          res.atualizados++;
        } else {
          if (!simular) await this.prisma.fornecedor.create({ data: { ...dados, tipoPessoa: dados.tipoPessoa ?? 'J', cpfCnpj: cpfCnpj ?? null } });
          res.criados++;
        }
      } catch (e) { new Logger('ImportarFornecedores').warn(`Linha ${l.linha}: ${(e as Error).message}`); erro('Não foi possível gravar esta linha.'); }
    }
    return res;
  }
}
