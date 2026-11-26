-- Capacidade de horas: jornada semanal (empresa ou técnico) e ajustes por data
CREATE TABLE IF NOT EXISTS "jornadas_semanais" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "tecnico_id" UUID,
  "minutos" INTEGER[] NOT NULL,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jornadas_semanais_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "jornadas_semanais_empresa_id_idx" ON "jornadas_semanais" ("empresa_id");
CREATE INDEX IF NOT EXISTS "jornadas_semanais_tecnico_id_idx" ON "jornadas_semanais" ("tecnico_id");
DO $$ BEGIN
  ALTER TABLE "jornadas_semanais" ADD CONSTRAINT "jornadas_semanais_tecnico_id_fkey"
    FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "jornada_ajustes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "tecnico_id" UUID NOT NULL,
  "data" DATE NOT NULL,
  "minutos" INTEGER NOT NULL,
  "motivo" VARCHAR(120),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jornada_ajustes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "jornada_ajustes_tecnico_id_data_key" ON "jornada_ajustes" ("tecnico_id", "data");
CREATE INDEX IF NOT EXISTS "jornada_ajustes_empresa_id_idx" ON "jornada_ajustes" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "jornada_ajustes" ADD CONSTRAINT "jornada_ajustes_tecnico_id_fkey"
    FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
