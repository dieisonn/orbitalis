-- Produtos: campos do layout de importação (estoque máximo, CEST, origem, pesos, comissão)
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "estoque_maximo" DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cest" VARCHAR(10);
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "origem" INTEGER;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "peso_bruto" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "peso_liquido" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "comissao_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0;
