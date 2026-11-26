/**
 * Motivos de cancelamento de O.S. Lista fixa (vale para qualquer empresa) para permitir relatório.
 * `resp` diz de quem foi a causa: a própria empresa/equipe, o cliente ou ninguém em particular.
 */
export type RespCancelamento = 'empresa' | 'cliente' | 'outro';

export const MOTIVOS_CANCELAMENTO: Record<string, { label: string; resp: RespCancelamento }> = {
  desistencia_atraso:   { label: 'Cliente desistiu por atraso nosso', resp: 'empresa' },
  falha_equipe:         { label: 'Falha da equipe (técnico ausente, erro de agenda ou de atendimento)', resp: 'empresa' },
  falta_material:       { label: 'Falta de peça, material ou equipamento', resp: 'empresa' },
  cliente_desistiu:     { label: 'Cliente desistiu (outro motivo)', resp: 'cliente' },
  cliente_ausente:      { label: 'Cliente ausente ou sem acesso ao local', resp: 'cliente' },
  valor_nao_aprovado:   { label: 'Cliente não aprovou o valor', resp: 'cliente' },
  resolvido:            { label: 'Problema já resolvido / não é mais necessário', resp: 'cliente' },
  duplicada:            { label: 'O.S. duplicada ou aberta por engano', resp: 'outro' },
  forca_maior:          { label: 'Clima ou força maior', resp: 'outro' },
  outro:                { label: 'Outro motivo', resp: 'outro' },
};

export const respDoMotivo = (codigo: string | null | undefined): RespCancelamento | null =>
  (codigo && MOTIVOS_CANCELAMENTO[codigo]?.resp) || null;
