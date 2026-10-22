-- Avisos de eventos próximos da agenda (minutos de antecedência, até 3; padrão 30)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "avisos_agenda" INTEGER[] NOT NULL DEFAULT ARRAY[30]::INTEGER[];
