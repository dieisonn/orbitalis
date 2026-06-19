-- CreateTable tipos_servico
CREATE TABLE "tipos_servico" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "sigla"             VARCHAR(5)   NOT NULL,
    "nome"              VARCHAR(100) NOT NULL,
    "cor_hex"           VARCHAR(7)   NOT NULL,
    "calendar_color_id" VARCHAR(5)   NOT NULL DEFAULT '7',
    "valor_padrao"      DECIMAL(10,2),
    "ativo"             BOOLEAN      NOT NULL DEFAULT TRUE,
    "sistema"           BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT "tipos_servico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tipos_servico_sigla_key" ON "tipos_servico"("sigla");

-- Seed tipos de serviço padrão
INSERT INTO "tipos_servico" ("sigla", "nome", "cor_hex", "calendar_color_id", "ativo", "sistema") VALUES
  ('VT', 'Visita Técnica',            '#039BE5', '7',  TRUE, TRUE),
  ('IN', 'Instalação',                '#0B8043', '10', TRUE, TRUE),
  ('MP', 'Manutenção Preventiva',     '#0B8043', '10', TRUE, TRUE),
  ('MC', 'Manutenção Corretiva',      '#0B8043', '10', TRUE, TRUE),
  ('PM', 'PMOC',                      '#0B8043', '10', TRUE, TRUE),
  ('LQ', 'Limpeza Química',           '#0B8043', '10', TRUE, TRUE),
  ('DS', 'Desinstalação',             '#0B8043', '10', TRUE, TRUE),
  ('MI', 'Montagem de Infraestrutura','#F4511E', '6',  TRUE, TRUE),
  ('RT', 'Retrabalho',                '#D50000', '11', TRUE, TRUE),
  ('TR', 'Treinamento',               '#8E24AA', '3',  TRUE, TRUE),
  ('RE', 'Reunião Estratégica',       '#8E24AA', '3',  TRUE, TRUE),
  ('LA', 'Lembrete de Ação',          '#E67C73', '4',  TRUE, TRUE);

-- AddColumns to ordens_servico
ALTER TABLE "ordens_servico"
  ADD COLUMN IF NOT EXISTS "tipo_servico_id" UUID REFERENCES "tipos_servico"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "hora_inicio"     VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "hora_fim"        VARCHAR(5);
