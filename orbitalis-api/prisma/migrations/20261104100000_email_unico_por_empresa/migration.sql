-- E-mail passa a ser único por empresa (sistemas independentes), não no sistema todo.
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_email_key";
DROP INDEX IF EXISTS "usuarios_email_key";

-- Usuários removidos de uma empresa ficavam com empresa_id nulo e seguiam "ocupando" o e-mail (e ainda conseguiam logar).
-- Libera o e-mail e invalida a senha; o registro continua existindo só para manter o histórico (O.S., agenda, log).
UPDATE "usuarios"
SET "email" = 'removido+' || "id"::text || '@removido.invalid',
    "senha_hash" = '!'
WHERE "empresa_id" IS NULL
  AND "email" NOT LIKE 'removido+%@removido.invalid';

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_empresa_email_key" ON "usuarios" ("empresa_id", lower("email")) WHERE "empresa_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "usuarios_email_idx" ON "usuarios" ("email");
CREATE INDEX IF NOT EXISTS "usuarios_email_lower_idx" ON "usuarios" (lower("email"));
