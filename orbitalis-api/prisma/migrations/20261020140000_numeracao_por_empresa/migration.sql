-- Numeração de O.S. e orçamentos passa a ser sequencial POR empresa
-- (antes o contador era global: a primeira O.S. de uma empresa nova saía como nº 84).
-- Os números já emitidos não mudam; cada empresa continua a partir do seu maior número.

CREATE TABLE IF NOT EXISTS "contadores_empresa" (
  "empresa_id" UUID NOT NULL,
  "nome" VARCHAR(40) NOT NULL,
  "valor" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "contadores_empresa_pkey" PRIMARY KEY ("empresa_id", "nome")
);

INSERT INTO "contadores_empresa" ("empresa_id", "nome", "valor")
SELECT "empresa_id", 'ordem_servico', COALESCE(MAX("numero"), 0)
FROM "ordens_servico" WHERE "empresa_id" IS NOT NULL GROUP BY "empresa_id"
ON CONFLICT ("empresa_id", "nome") DO NOTHING;

INSERT INTO "contadores_empresa" ("empresa_id", "nome", "valor")
SELECT "empresa_id", 'orcamento', COALESCE(MAX("numero"), 0)
FROM "orcamentos" WHERE "empresa_id" IS NOT NULL GROUP BY "empresa_id"
ON CONFLICT ("empresa_id", "nome") DO NOTHING;

DROP INDEX IF EXISTS "ordens_servico_numero_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ordens_servico_empresa_id_numero_key" ON "ordens_servico"("empresa_id", "numero");

DROP INDEX IF EXISTS "orcamentos_numero_key";
CREATE UNIQUE INDEX IF NOT EXISTS "orcamentos_empresa_id_numero_key" ON "orcamentos"("empresa_id", "numero");
