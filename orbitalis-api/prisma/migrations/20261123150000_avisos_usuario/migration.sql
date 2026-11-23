CREATE TABLE IF NOT EXISTS "avisos_usuario" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "usuario_id" UUID NOT NULL,
  "titulo" VARCHAR(200) NOT NULL,
  "corpo" TEXT NOT NULL,
  "url" VARCHAR(300),
  "lido_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avisos_usuario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "avisos_usuario_usuario_id_criado_em_idx" ON "avisos_usuario" ("usuario_id", "criado_em");
CREATE INDEX IF NOT EXISTS "avisos_usuario_empresa_id_idx" ON "avisos_usuario" ("empresa_id");
