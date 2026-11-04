import { ArgumentsHost, BadRequestException, Catch, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

const CAMPOS: Record<string, string> = {
  email: 'e-mail', documento: 'documento (CPF/CNPJ)', telefone: 'telefone', celular: 'celular', nome: 'nome',
  razao_social: 'razão social', razaoSocial: 'razão social', numero_serie: 'número de série', numeroSerie: 'número de série',
};
const nomeCampo = (c?: string) => (c && CAMPOS[c]) || c || 'campo';

// Erros do banco viram mensagens claras (em vez de "Internal server error"):
// valor duplicado → 409; texto longo demais → 400. O restante segue como erro interno.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(erro: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const meta = (erro.meta ?? {}) as { target?: string | string[]; column?: string };
    if (erro.code === 'P2002') {
      const alvo = Array.isArray(meta.target) ? meta.target : meta.target ? [meta.target] : [];
      const campo = alvo.find((t) => t !== 'empresa_id' && t !== 'empresaId');
      return super.catch(new ConflictException(`Já existe um cadastro com esse ${nomeCampo(campo)}.`), host);
    }
    if (erro.code === 'P2000') {
      return super.catch(new BadRequestException(`O valor informado em ${nomeCampo(meta.column)} é longo demais.`), host);
    }
    return super.catch(erro, host);
  }
}
