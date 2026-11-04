ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "tipos_servico_extras" UUID[] NOT NULL DEFAULT '{}';
