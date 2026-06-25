-- AlterTable
ALTER TABLE "configuracao_empresa"
  ADD COLUMN IF NOT EXISTS "mttr_limite_horas" INTEGER,
  ADD COLUMN IF NOT EXISTS "mtbf_limite_dias"  INTEGER;
