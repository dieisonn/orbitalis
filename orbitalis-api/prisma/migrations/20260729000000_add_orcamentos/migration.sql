-- CreateEnum
CREATE TYPE "OrcamentoStatus" AS ENUM ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado');

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" SERIAL NOT NULL,
    "status" "OrcamentoStatus" NOT NULL DEFAULT 'rascunho',
    "titulo" VARCHAR(255) NOT NULL,
    "validade_dias" INTEGER NOT NULL DEFAULT 30,
    "observacoes" TEXT,
    "token_publico" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "criado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprovado_em" TIMESTAMP(3),
    "rejeitado_em" TIMESTAMP(3),

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "descricao" VARCHAR(255) NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unidade" VARCHAR(20) NOT NULL DEFAULT 'un',
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "orcamento_id" UUID NOT NULL,

    CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_numero_key" ON "orcamentos"("numero");
CREATE UNIQUE INDEX "orcamentos_token_publico_key" ON "orcamentos"("token_publico");
CREATE INDEX "orcamentos_cliente_id_idx" ON "orcamentos"("cliente_id");
CREATE INDEX "orcamentos_status_idx" ON "orcamentos"("status");

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_id_fkey"
    FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamento_id_fkey"
    FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
