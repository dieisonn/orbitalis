ALTER TABLE "fornecedores" ADD COLUMN IF NOT EXISTS "inscricao_municipal" VARCHAR(30);
ALTER TABLE "fornecedores" ADD COLUMN IF NOT EXISTS "rg" VARCHAR(30);
ALTER TABLE "fornecedores" ADD COLUMN IF NOT EXISTS "data_nascimento" DATE;
