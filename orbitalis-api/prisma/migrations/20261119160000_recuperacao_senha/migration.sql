-- Aditiva: senha provisória (troca obrigatória) e links de redefinição de senha por e-mail.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "senha_provisoria" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "redefinicoes_senha" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expira_em"  TIMESTAMP(3) NOT NULL,
  "usado_em"   TIMESTAMP(3),
  "criado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redefinicoes_senha_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "redefinicoes_senha_usuario_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "redefinicoes_senha_token_hash_key" ON "redefinicoes_senha"("token_hash");
CREATE INDEX IF NOT EXISTS "redefinicoes_senha_usuario_idx" ON "redefinicoes_senha"("usuario_id");
