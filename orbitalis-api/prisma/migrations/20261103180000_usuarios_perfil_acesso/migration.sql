-- Perfis de acesso da equipe do escritório: admin com perfil null/'administrador' = acesso total;
-- demais perfis enxergam só os módulos listados em permissoes.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "perfil_acesso" VARCHAR(30);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "convites" ADD COLUMN IF NOT EXISTS "perfil_acesso" VARCHAR(30);
ALTER TABLE "convites" ADD COLUMN IF NOT EXISTS "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
