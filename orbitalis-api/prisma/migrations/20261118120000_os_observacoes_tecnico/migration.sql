-- Aditiva: observação geral do técnico na O.S., com o autor e o horário do registro.
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "observacoes_tecnico" TEXT;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "observacoes_tecnico_por" VARCHAR(120);
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "observacoes_tecnico_em" TIMESTAMP(3);
