-- Contato da empresa e instruções impressas na O.S. (configuráveis por empresa)
ALTER TABLE "configuracao_empresa" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "configuracao_empresa" ADD COLUMN IF NOT EXISTS "site" VARCHAR(255);
ALTER TABLE "configuracao_empresa" ADD COLUMN IF NOT EXISTS "instrucoes_os" TEXT;
