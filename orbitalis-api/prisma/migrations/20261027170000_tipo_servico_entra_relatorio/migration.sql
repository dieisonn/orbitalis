-- Tipos de serviço que não contam no relatório de atendimentos da agenda (feriados, lembretes...)
ALTER TABLE "tipos_servico" ADD COLUMN IF NOT EXISTS "entra_no_relatorio" BOOLEAN NOT NULL DEFAULT true;
