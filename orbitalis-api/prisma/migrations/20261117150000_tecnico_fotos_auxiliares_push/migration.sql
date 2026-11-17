-- Aditiva: fotos da O.S., técnicos auxiliares, assinaturas de aviso no celular e nome de quem recebeu o serviço.
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "recebido_por" VARCHAR(120);

CREATE TABLE IF NOT EXISTS "ordem_servico_auxiliares" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ordem_servico_id" UUID NOT NULL,
  "tecnico_id" UUID NOT NULL,
  "empresa_id" UUID,
  CONSTRAINT "ordem_servico_auxiliares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ordem_servico_auxiliares_os_tecnico_key" ON "ordem_servico_auxiliares" ("ordem_servico_id", "tecnico_id");
CREATE INDEX IF NOT EXISTS "ordem_servico_auxiliares_tecnico_id_idx" ON "ordem_servico_auxiliares" ("tecnico_id");
CREATE INDEX IF NOT EXISTS "ordem_servico_auxiliares_empresa_id_idx" ON "ordem_servico_auxiliares" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "ordem_servico_auxiliares" ADD CONSTRAINT "ordem_servico_auxiliares_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ordem_servico_auxiliares" ADD CONSTRAINT "ordem_servico_auxiliares_tecnico_id_fkey"
    FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ordem_servico_fotos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ordem_servico_id" UUID NOT NULL,
  "item_id" UUID,
  "checklist_item_id" VARCHAR(60),
  "momento" VARCHAR(10) NOT NULL DEFAULT 'outra',
  "legenda" VARCHAR(200),
  "mime" VARCHAR(40) NOT NULL DEFAULT 'image/jpeg',
  "dados" BYTEA NOT NULL,
  "criado_por" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "empresa_id" UUID,
  CONSTRAINT "ordem_servico_fotos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ordem_servico_fotos_ordem_servico_id_idx" ON "ordem_servico_fotos" ("ordem_servico_id");
CREATE INDEX IF NOT EXISTS "ordem_servico_fotos_empresa_id_idx" ON "ordem_servico_fotos" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "ordem_servico_fotos" ADD CONSTRAINT "ordem_servico_fotos_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ordem_servico_fotos" ADD CONSTRAINT "ordem_servico_fotos_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "ordem_servico_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "push_assinaturas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "empresa_id" UUID,
  CONSTRAINT "push_assinaturas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "push_assinaturas_endpoint_key" ON "push_assinaturas" ("endpoint");
CREATE INDEX IF NOT EXISTS "push_assinaturas_usuario_id_idx" ON "push_assinaturas" ("usuario_id");
CREATE INDEX IF NOT EXISTS "push_assinaturas_empresa_id_idx" ON "push_assinaturas" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "push_assinaturas" ADD CONSTRAINT "push_assinaturas_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Par de chaves do serviço de avisos (uma linha só; gerado pela API na primeira vez)
CREATE TABLE IF NOT EXISTS "push_config" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "chave_publica" TEXT NOT NULL,
  "chave_privada" TEXT NOT NULL,
  CONSTRAINT "push_config_pkey" PRIMARY KEY ("id")
);
