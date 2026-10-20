-- Agenda própria do Orbitalis: substitui a integração com o Google Agenda.

-- Duração prevista por tipo de serviço (minutos)
ALTER TABLE "tipos_servico" ADD COLUMN IF NOT EXISTS "duracao_minutos" INTEGER NOT NULL DEFAULT 60;

UPDATE "tipos_servico" SET "duracao_minutos" = CASE "sigla"
  WHEN 'VT' THEN 60
  WHEN 'IN' THEN 240
  WHEN 'MP' THEN 120
  WHEN 'MC' THEN 120
  WHEN 'PM' THEN 120
  WHEN 'LQ' THEN 120
  WHEN 'DS' THEN 120
  WHEN 'MI' THEN 480
  WHEN 'RT' THEN 120
  WHEN 'TR' THEN 120
  WHEN 'RE' THEN 60
  WHEN 'LA' THEN 30
  ELSE "duracao_minutos" END
WHERE "sistema" = true;

CREATE TABLE IF NOT EXISTS "eventos_agenda" (
  "id" UUID NOT NULL,
  "empresa_id" UUID,
  "titulo" VARCHAR(200) NOT NULL,
  "descricao" TEXT,
  "local" TEXT,
  "inicio" TIMESTAMP(3) NOT NULL,
  "fim" TIMESTAMP(3) NOT NULL,
  "dia_inteiro" BOOLEAN NOT NULL DEFAULT false,
  "cor" VARCHAR(7),
  "personalizado" BOOLEAN NOT NULL DEFAULT false,
  "ordem_servico_id" UUID,
  "tipo_servico_id" UUID,
  "tecnico_id" UUID,
  "cliente_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eventos_agenda_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eventos_agenda_ordem_servico_id_key" ON "eventos_agenda"("ordem_servico_id");
CREATE INDEX IF NOT EXISTS "eventos_agenda_empresa_id_inicio_idx" ON "eventos_agenda"("empresa_id", "inicio");
CREATE INDEX IF NOT EXISTS "eventos_agenda_tecnico_id_idx" ON "eventos_agenda"("tecnico_id");

ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_ordem_servico_id_fkey"
  FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_tipo_servico_id_fkey"
  FOREIGN KEY ("tipo_servico_id") REFERENCES "tipos_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_tecnico_id_fkey"
  FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remoção total do Google Agenda (inclui os tokens OAuth guardados)
ALTER TABLE "ordens_servico" DROP COLUMN IF EXISTS "google_calendar_event_id";
ALTER TABLE "tipos_servico" DROP COLUMN IF EXISTS "calendar_color_id";
ALTER TABLE "configuracao_empresa"
  DROP COLUMN IF EXISTS "google_conectado",
  DROP COLUMN IF EXISTS "google_email",
  DROP COLUMN IF EXISTS "google_calendar_id",
  DROP COLUMN IF EXISTS "google_access_token",
  DROP COLUMN IF EXISTS "google_refresh_token",
  DROP COLUMN IF EXISTS "google_token_expiry";
