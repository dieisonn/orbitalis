-- Funil de visitas: tipo de serviço "é visita" + orçamento aponta para a visita que o originou
ALTER TABLE "tipos_servico" ADD COLUMN IF NOT EXISTS "eh_visita" BOOLEAN NOT NULL DEFAULT false;
UPDATE "tipos_servico" SET "eh_visita" = true WHERE "sigla" = 'VT' AND "sistema" = true;

ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "visita_origem_id" UUID;
CREATE INDEX IF NOT EXISTS "orcamentos_visita_origem_id_idx" ON "orcamentos" ("visita_origem_id");
DO $$ BEGIN
  ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_visita_origem_id_fkey"
    FOREIGN KEY ("visita_origem_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
