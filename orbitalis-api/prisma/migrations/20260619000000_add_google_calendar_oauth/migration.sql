-- AddColumn google_calendar_event_id to ordens_servico
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "google_calendar_event_id" VARCHAR(255);

-- AddColumns Google OAuth to configuracao_empresa
ALTER TABLE "configuracao_empresa"
  ADD COLUMN IF NOT EXISTS "google_conectado"    BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "google_email"        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "google_calendar_id"  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "google_access_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_refresh_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_token_expiry"  TIMESTAMP(3);
