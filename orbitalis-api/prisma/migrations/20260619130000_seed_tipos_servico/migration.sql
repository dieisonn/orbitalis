-- Seed tipos de serviço padrão (INSERT OR IGNORE via ON CONFLICT)
INSERT INTO "tipos_servico" ("sigla", "nome", "cor_hex", "calendar_color_id", "ativo", "sistema")
VALUES
  ('VT', 'Visita Técnica',             '#039BE5', '7',  TRUE, TRUE),
  ('IN', 'Instalação',                 '#0B8043', '10', TRUE, TRUE),
  ('MP', 'Manutenção Preventiva',      '#0B8043', '10', TRUE, TRUE),
  ('MC', 'Manutenção Corretiva',       '#0B8043', '10', TRUE, TRUE),
  ('PM', 'PMOC',                       '#0B8043', '10', TRUE, TRUE),
  ('LQ', 'Limpeza Química',            '#0B8043', '10', TRUE, TRUE),
  ('DS', 'Desinstalação',              '#0B8043', '10', TRUE, TRUE),
  ('MI', 'Montagem de Infraestrutura', '#F4511E', '6',  TRUE, TRUE),
  ('RT', 'Retrabalho',                 '#D50000', '11', TRUE, TRUE),
  ('TR', 'Treinamento',                '#8E24AA', '3',  TRUE, TRUE),
  ('RE', 'Reunião Estratégica',        '#8E24AA', '3',  TRUE, TRUE),
  ('LA', 'Lembrete de Ação',           '#E67C73', '4',  TRUE, TRUE)
ON CONFLICT ("sigla") DO NOTHING;
