-- Add OsTipo enum and tipo column to ordens_servico

CREATE TYPE "OsTipo" AS ENUM ('preventiva', 'corretiva');

ALTER TABLE "ordens_servico"
  ADD COLUMN IF NOT EXISTS "tipo" "OsTipo" NOT NULL DEFAULT 'corretiva';
