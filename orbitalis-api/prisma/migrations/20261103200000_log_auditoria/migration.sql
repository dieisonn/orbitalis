-- Registro de atividades: quem fez o quê, quando (alterações feitas por usuários autenticados e logins)
CREATE TABLE IF NOT EXISTS "log_auditoria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(150),
  "usuario_email" VARCHAR(255),
  "usuario_tipo" VARCHAR(20),
  "acao" VARCHAR(20) NOT NULL,
  "metodo" VARCHAR(10),
  "rota" VARCHAR(255),
  "entidade" VARCHAR(50),
  "entidade_id" VARCHAR(60),
  "descricao" VARCHAR(255) NOT NULL,
  "detalhes" JSONB,
  "status" INTEGER,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "log_auditoria_empresa_id_criado_em_idx" ON "log_auditoria"("empresa_id", "criado_em" DESC);
CREATE INDEX IF NOT EXISTS "log_auditoria_usuario_id_idx" ON "log_auditoria"("usuario_id");
CREATE INDEX IF NOT EXISTS "log_auditoria_entidade_entidade_id_idx" ON "log_auditoria"("entidade", "entidade_id");
