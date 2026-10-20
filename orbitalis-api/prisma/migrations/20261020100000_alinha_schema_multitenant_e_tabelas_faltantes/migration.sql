-- Alinha o banco criado SÓ pelas migrações com o schema.prisma.
-- Antes disto, multi-tenant (empresas/empresa_id), convites, contratos, diagnósticos LGMV
-- e alguns campos da O.S. existiam apenas em bancos criados com `prisma db push`.
-- Tudo é idempotente (IF NOT EXISTS): roda igual num banco novo e no de produção.

CREATE TABLE IF NOT EXISTS "empresas" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "nome_empresa" VARCHAR(255) NOT NULL,
  "nome_fantasia" VARCHAR(255),
  "plano" VARCHAR(50) NOT NULL DEFAULT 'basico',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "empresas_slug_key" ON "empresas"("slug");

DO $$ BEGIN
  CREATE TYPE "ConviteTipo" AS ENUM ('tecnico', 'cliente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "convites" (
  "id" UUID NOT NULL,
  "token" UUID NOT NULL,
  "tipo" "ConviteTipo" NOT NULL,
  "email" VARCHAR(255),
  "cliente_id" UUID,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "usado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "empresa_id" UUID,
  CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "convites_token_key" ON "convites"("token");

CREATE TABLE IF NOT EXISTS "contratos" (
  "id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "descricao" VARCHAR(255) NOT NULL,
  "valor_mensal" DECIMAL(10,2),
  "vigencia_inicio" TIMESTAMP(3) NOT NULL,
  "vigencia_fim" TIMESTAMP(3) NOT NULL,
  "num_os_incluidas" INTEGER,
  "observacoes" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "empresa_id" UUID,
  CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "contratos_cliente_id_vigencia_fim_idx" ON "contratos"("cliente_id", "vigencia_fim");
DO $$ BEGIN
  ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "diagnosticos_lgmv" (
  "id" UUID NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "os_id" UUID,
  "arquivo_idu_nome" VARCHAR(255),
  "arquivo_odu_nome" VARCHAR(255),
  "data_inspecao" TIMESTAMP(3),
  "dados_idu" JSONB,
  "dados_odu" JSONB,
  "relatorio" JSONB NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnosticos_lgmv_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "diagnosticos_lgmv_equipamento_id_idx" ON "diagnosticos_lgmv"("equipamento_id");
DO $$ BEGIN
  ALTER TABLE "diagnosticos_lgmv" ADD CONSTRAINT "diagnosticos_lgmv_equipamento_id_fkey"
    FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "diagnosticos_lgmv" ADD CONSTRAINT "diagnosticos_lgmv_os_id_fkey"
    FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Campos da O.S.
ALTER TABLE "ordens_servico"
  ADD COLUMN IF NOT EXISTS "numero" SERIAL,
  ADD COLUMN IF NOT EXISTS "assinatura_base64" TEXT,
  ADD COLUMN IF NOT EXISTS "tipo_gas" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "quantidade_gas_gramas" DECIMAL(8,1);
CREATE UNIQUE INDEX IF NOT EXISTS "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- Coluna de tenant
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "ambientes" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "equipamentos" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "modelos_checklist" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "tipos_servico" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "configuracao_empresa" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "alerta_config" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "alerta_ocorrencias" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "empresa_id" UUID;
