-- Agrupamento das O.S. por visita (cliente) e horário padrão nos planos preventivos
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "agrupamento" VARCHAR(10);
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "max_equipamentos_por_os" INTEGER;
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "hora_inicio" VARCHAR(5);
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "hora_fim" VARCHAR(5);
ALTER TABLE "configuracao_empresa" ADD COLUMN IF NOT EXISTS "agrupamento_os_padrao" VARCHAR(10) NOT NULL DEFAULT 'cliente';
