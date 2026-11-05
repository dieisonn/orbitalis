-- Dias de trabalho de uma O.S. que dura mais de um dia (cada dia com entrada e saída) e um evento de agenda por dia.
CREATE TABLE IF NOT EXISTS "ordem_servico_dias" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ordem_servico_id" UUID NOT NULL,
  "data" DATE NOT NULL,
  "hora_inicio" VARCHAR(5),
  "hora_fim" VARCHAR(5),
  "empresa_id" UUID,
  CONSTRAINT "ordem_servico_dias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ordem_servico_dias_ordem_servico_id_data_key" ON "ordem_servico_dias" ("ordem_servico_id", "data");
CREATE INDEX IF NOT EXISTS "ordem_servico_dias_empresa_id_idx" ON "ordem_servico_dias" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "ordem_servico_dias" ADD CONSTRAINT "ordem_servico_dias_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "os_dia_id" UUID;
ALTER TABLE "eventos_agenda" DROP CONSTRAINT IF EXISTS "eventos_agenda_ordem_servico_id_key";
DROP INDEX IF EXISTS "eventos_agenda_ordem_servico_id_key";
CREATE INDEX IF NOT EXISTS "eventos_agenda_ordem_servico_id_idx" ON "eventos_agenda" ("ordem_servico_id");
DO $$ BEGIN
  ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_os_dia_id_fkey"
    FOREIGN KEY ("os_dia_id") REFERENCES "ordem_servico_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
