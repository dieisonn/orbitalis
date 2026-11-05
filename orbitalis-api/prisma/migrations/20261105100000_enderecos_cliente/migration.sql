ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "enderecos_extras" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "endereco_id" VARCHAR(40);
