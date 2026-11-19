-- Aditiva: avisos por evento (liga/desliga e antecedências personalizadas em minutos).
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "avisar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "avisos_minutos" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
