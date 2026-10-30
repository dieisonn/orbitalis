-- Renovação de contratos: o novo contrato guarda o anterior (histórico)
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "renovado_de_id" UUID;
DO $$ BEGIN
  ALTER TABLE "contratos" ADD CONSTRAINT "contratos_renovado_de_id_fkey"
    FOREIGN KEY ("renovado_de_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "contratos_renovado_de_id_idx" ON "contratos"("renovado_de_id");
