-- Orçamento fase 2: desconto, frete, pagamento, parcelas, anexos e itens ligados ao catálogo/estoque
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "desconto_tipo" VARCHAR(10) NOT NULL DEFAULT 'valor';
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "frete" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "forma_pagamento" VARCHAR(60);
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "observacoes_internas" TEXT;

ALTER TABLE "orcamento_itens" ADD COLUMN IF NOT EXISTS "produto_id" UUID;
ALTER TABLE "orcamento_itens" ADD COLUMN IF NOT EXISTS "servico_id" UUID;
ALTER TABLE "orcamento_itens" ADD COLUMN IF NOT EXISTS "ordem" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orcamento_itens" ADD COLUMN IF NOT EXISTS "estoque_baixado" DECIMAL(14,3) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "orcamento_itens_orcamento_id_idx" ON "orcamento_itens" ("orcamento_id");

CREATE TABLE IF NOT EXISTS "orcamento_parcelas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "numero" INTEGER NOT NULL,
  "vencimento" DATE NOT NULL,
  "valor" DECIMAL(12,2) NOT NULL,
  "orcamento_id" UUID NOT NULL,
  CONSTRAINT "orcamento_parcelas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orcamento_parcelas_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "orcamento_parcelas_orcamento_id_idx" ON "orcamento_parcelas" ("orcamento_id");

CREATE TABLE IF NOT EXISTS "orcamento_anexos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(255) NOT NULL,
  "tipo" VARCHAR(100) NOT NULL,
  "tamanho" INTEGER NOT NULL,
  "conteudo" BYTEA NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orcamento_id" UUID NOT NULL,
  CONSTRAINT "orcamento_anexos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orcamento_anexos_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "orcamento_anexos_orcamento_id_idx" ON "orcamento_anexos" ("orcamento_id");
