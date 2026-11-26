// Motivos de cancelamento de O.S. (mesma lista do servidor). `resp` = de quem foi a causa.
export type RespCancelamento = 'empresa' | 'cliente' | 'outro'

export const MOTIVOS_CANCELAMENTO: { codigo: string; label: string; resp: RespCancelamento }[] = [
  { codigo: 'desistencia_atraso', label: 'Cliente desistiu por atraso nosso', resp: 'empresa' },
  { codigo: 'falha_equipe', label: 'Falha da equipe (técnico ausente, erro de agenda ou de atendimento)', resp: 'empresa' },
  { codigo: 'falta_material', label: 'Falta de peça, material ou equipamento', resp: 'empresa' },
  { codigo: 'cliente_desistiu', label: 'Cliente desistiu (outro motivo)', resp: 'cliente' },
  { codigo: 'cliente_ausente', label: 'Cliente ausente ou sem acesso ao local', resp: 'cliente' },
  { codigo: 'valor_nao_aprovado', label: 'Cliente não aprovou o valor', resp: 'cliente' },
  { codigo: 'resolvido', label: 'Problema já resolvido / não é mais necessário', resp: 'cliente' },
  { codigo: 'duplicada', label: 'O.S. duplicada ou aberta por engano', resp: 'outro' },
  { codigo: 'forca_maior', label: 'Clima ou força maior', resp: 'outro' },
  { codigo: 'outro', label: 'Outro motivo', resp: 'outro' },
]

export const RESP_LABEL: Record<RespCancelamento, string> = { empresa: 'Causa da empresa', cliente: 'Causa do cliente', outro: 'Outra causa' }

export const motivoLabel = (c?: string | null) => MOTIVOS_CANCELAMENTO.find((m) => m.codigo === c)?.label ?? null
export const motivoResp = (c?: string | null) => MOTIVOS_CANCELAMENTO.find((m) => m.codigo === c)?.resp ?? null

/** A explicação é obrigatória quando a causa é da empresa ou "outro" (mínimo 5 caracteres). */
export const precisaDetalhe = (c: string) => motivoResp(c) === 'empresa' || c === 'outro'
export const cancelamentoValido = (motivo: string, detalhe: string) =>
  !!motivo && (!precisaDetalhe(motivo) || detalhe.trim().length >= 5)

export type Cancelamento = { motivo: string; detalhe: string }
