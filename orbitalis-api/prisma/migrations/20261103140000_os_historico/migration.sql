-- Histórico de mudanças de status da O.S.: quando aconteceu, quem registrou e observação
CREATE TABLE IF NOT EXISTS "ordem_servico_historico" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ordem_servico_id" UUID NOT NULL,
  "de_status" VARCHAR(20),
  "para_status" VARCHAR(20) NOT NULL,
  "ocorrido_em" TIMESTAMP(3) NOT NULL,
  "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(150),
  "observacao" TEXT,
  CONSTRAINT "ordem_servico_historico_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ordem_servico_historico_ordem_servico_id_idx" ON "ordem_servico_historico"("ordem_servico_id");
DO $$ BEGIN
  ALTER TABLE "ordem_servico_historico" ADD CONSTRAINT "ordem_servico_historico_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
