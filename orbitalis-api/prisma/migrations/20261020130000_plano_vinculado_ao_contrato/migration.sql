-- Plano preventivo pode atender a um contrato (consumo de O.S. do contrato)
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "contrato_id" UUID;
CREATE INDEX IF NOT EXISTS "planos_manutencao_contrato_id_idx" ON "planos_manutencao"("contrato_id");
DO $$ BEGIN
  ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_contrato_id_fkey"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
