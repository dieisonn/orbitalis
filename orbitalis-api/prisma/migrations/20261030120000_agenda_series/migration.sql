-- Séries de eventos da agenda (repetições)
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "serie_id" UUID;
CREATE INDEX IF NOT EXISTS "eventos_agenda_serie_id_idx" ON "eventos_agenda"("serie_id");
