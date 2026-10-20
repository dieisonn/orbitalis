-- Clientes importados de planilhas: documento (CPF/CNPJ) passa a ser opcional e
-- entram e-mail, celular, cidade e UF.
ALTER TABLE "clientes" ALTER COLUMN "documento" DROP NOT NULL;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "celular" VARCHAR(20);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "cidade" VARCHAR(100);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "uf" VARCHAR(2);
