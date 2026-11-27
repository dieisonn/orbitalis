-- Produtos: despesas da compra, dimensões e código de benefício fiscal
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "despesas_acessorias" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "outras_despesas" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "largura" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "altura" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "comprimento" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cod_beneficio" VARCHAR(20);
