-- Inventário de estoque (conferência física) — aditivo, idempotente
CREATE TABLE IF NOT EXISTS "inventarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "numero" SERIAL NOT NULL,
  "titulo" VARCHAR(120) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'aberto',
  "contagem_cega" BOOLEAN NOT NULL DEFAULT false,
  "filtro_categoria" VARCHAR(80),
  "filtro_localizacao" VARCHAR(120),
  "observacoes" TEXT,
  "criado_por_id" UUID,
  "concluido_por_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluido_em" TIMESTAMP(3),
  CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventarios_empresa_id_numero_key" ON "inventarios" ("empresa_id", "numero");
CREATE INDEX IF NOT EXISTS "inventarios_empresa_id_criado_em_idx" ON "inventarios" ("empresa_id", "criado_em");

CREATE TABLE IF NOT EXISTS "inventario_itens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "inventario_id" UUID NOT NULL,
  "produto_id" UUID NOT NULL,
  "saldo_sistema" DECIMAL(14,3) NOT NULL,
  "contado" DECIMAL(14,3),
  "contado_em" TIMESTAMP(3),
  "contado_por_id" UUID,
  "observacao" VARCHAR(500),
  "ajuste_aplicado" DECIMAL(14,3),
  CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventario_itens_inventario_id_produto_id_key" ON "inventario_itens" ("inventario_id", "produto_id");
CREATE INDEX IF NOT EXISTS "inventario_itens_empresa_id_idx" ON "inventario_itens" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_inventario_id_fkey"
    FOREIGN KEY ("inventario_id") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_produto_id_fkey"
    FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
