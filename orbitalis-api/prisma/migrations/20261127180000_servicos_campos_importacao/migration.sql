-- Catálogo de serviços: campos do layout de importação/exportação (código, custo, comissão, atividade, NBS)
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "codigo" VARCHAR(60);
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "valor_custo" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "comissao_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "atividade_servico" VARCHAR(120);
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "nbs" VARCHAR(20);
-- código único por empresa entre os serviços não excluídos
CREATE UNIQUE INDEX IF NOT EXISTS "servicos_empresa_codigo_uq" ON "servicos" ("empresa_id", "codigo") WHERE "codigo" IS NOT NULL AND "deleted_at" IS NULL;
