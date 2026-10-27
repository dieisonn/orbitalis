-- Evento da agenda com mais de um tipo de serviço (ex.: VT + MC): os adicionais ficam aqui
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "tipos_extras_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
