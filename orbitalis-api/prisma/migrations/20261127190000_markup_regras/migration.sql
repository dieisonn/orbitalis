-- Markup padrão por empresa (categoria vazia = regra geral)
CREATE TABLE IF NOT EXISTS "markup_regras" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "categoria" VARCHAR(80) NOT NULL DEFAULT '',
  "percentual" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "markup_regras_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "markup_regras_empresa_id_categoria_key" ON "markup_regras" ("empresa_id", "categoria");
CREATE INDEX IF NOT EXISTS "markup_regras_empresa_id_idx" ON "markup_regras" ("empresa_id");
