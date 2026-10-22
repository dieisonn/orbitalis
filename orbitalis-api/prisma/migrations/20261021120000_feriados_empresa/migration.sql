-- Localização da empresa
ALTER TABLE "configuracao_empresa"
  ADD COLUMN IF NOT EXISTS "cidade" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "uf" VARCHAR(2),
  ADD COLUMN IF NOT EXISTS "codigo_ibge" VARCHAR(7);

-- Feriados cadastrados pela empresa
DO $$ BEGIN
  CREATE TYPE "TipoFeriado" AS ENUM ('municipal', 'estadual', 'personalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "feriados_empresa" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "data"       DATE NOT NULL,
  "nome"       VARCHAR(150) NOT NULL,
  "tipo"       "TipoFeriado" NOT NULL,
  "recorrente" BOOLEAN NOT NULL DEFAULT false,
  "origem"     VARCHAR(30) NOT NULL DEFAULT 'manual',
  "criado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feriados_empresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feriados_empresa_empresa_id_data_nome_key" ON "feriados_empresa"("empresa_id", "data", "nome");
CREATE INDEX IF NOT EXISTS "feriados_empresa_empresa_id_data_idx" ON "feriados_empresa"("empresa_id", "data");
