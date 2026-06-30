-- Cria AlertaTipo se não existir (inclui mttr_critico já na criação)
DO $$ BEGIN
  CREATE TYPE "AlertaTipo" AS ENUM (
    'os_atrasada',
    'os_sem_atualizacao',
    'equipamento_reincidente',
    'contrato_vencendo',
    'plano_vencendo',
    'mttr_critico'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Adiciona mttr_critico caso o enum já existia sem ele
DO $$ BEGIN
  ALTER TYPE "AlertaTipo" ADD VALUE IF NOT EXISTS 'mttr_critico';
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Cria AlertaSeveridade se não existir
DO $$ BEGIN
  CREATE TYPE "AlertaSeveridade" AS ENUM ('info', 'aviso', 'critico');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Cria tabela alerta_config se não existir
CREATE TABLE IF NOT EXISTS "alerta_config" (
  "id"                         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "os_sem_atualizacao_dias"    INTEGER      NOT NULL DEFAULT 3,
  "equipamento_corretivas_mes" INTEGER      NOT NULL DEFAULT 3,
  "contrato_vencendo_dias"     INTEGER      NOT NULL DEFAULT 30,
  "plano_vencendo_dias"        INTEGER      NOT NULL DEFAULT 30,
  CONSTRAINT "alerta_config_pkey" PRIMARY KEY ("id")
);

-- Cria tabela alerta_ocorrencias se não existir
CREATE TABLE IF NOT EXISTS "alerta_ocorrencias" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tipo"          "AlertaTipo" NOT NULL,
  "severidade"    "AlertaSeveridade" NOT NULL,
  "titulo"        VARCHAR(255) NOT NULL,
  "descricao"     TEXT         NOT NULL,
  "referencia_id" VARCHAR(255),
  "resolvido"     BOOLEAN      NOT NULL DEFAULT false,
  "criado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em"  TIMESTAMP(3),
  CONSTRAINT "alerta_ocorrencias_pkey" PRIMARY KEY ("id")
);

-- Índice para listagem de alertas ativos
CREATE INDEX IF NOT EXISTS "alerta_ocorrencias_resolvido_criado_em_idx"
  ON "alerta_ocorrencias"("resolvido", "criado_em");

-- Adiciona custo_hora_parada à configuração da empresa
ALTER TABLE "configuracao_empresa"
  ADD COLUMN IF NOT EXISTS "custo_hora_parada" DECIMAL(10,2);
