-- Financeiro: contas, categorias e lançamentos a receber/pagar (fluxo de caixa)
CREATE TABLE IF NOT EXISTS "contas_financeiras" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "nome" VARCHAR(80) NOT NULL,
  "tipo" VARCHAR(20) NOT NULL DEFAULT 'banco',
  "saldo_inicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contas_financeiras_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "contas_financeiras_empresa_id_idx" ON "contas_financeiras" ("empresa_id");

CREATE TABLE IF NOT EXISTS "categorias_financeiras" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "nome" VARCHAR(80) NOT NULL,
  "tipo" VARCHAR(10) NOT NULL,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "categorias_financeiras_empresa_id_tipo_nome_key" ON "categorias_financeiras" ("empresa_id", "tipo", "nome");

CREATE TABLE IF NOT EXISTS "lancamentos_financeiros" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "numero" SERIAL NOT NULL,
  "tipo" VARCHAR(10) NOT NULL,
  "descricao" VARCHAR(255) NOT NULL,
  "valor" DECIMAL(14,2) NOT NULL,
  "vencimento" DATE NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'aberto',
  "pago_em" DATE,
  "valor_pago" DECIMAL(14,2),
  "documento" VARCHAR(60),
  "observacoes" TEXT,
  "grupo_id" UUID,
  "parcela" INTEGER,
  "total_parcelas" INTEGER,
  "conta_id" UUID,
  "categoria_id" UUID,
  "cliente_id" UUID,
  "fornecedor_id" UUID,
  "orcamento_id" UUID,
  "movimento_estoque_id" UUID,
  "criado_por_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lancamentos_financeiros_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "lancamentos_financeiros_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "lancamentos_financeiros_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "lancamentos_financeiros_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "lancamentos_financeiros_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lancamentos_financeiros_empresa_id_numero_key" ON "lancamentos_financeiros" ("empresa_id", "numero");
CREATE INDEX IF NOT EXISTS "lancamentos_financeiros_empresa_id_tipo_status_vencimento_idx" ON "lancamentos_financeiros" ("empresa_id", "tipo", "status", "vencimento");
CREATE INDEX IF NOT EXISTS "lancamentos_financeiros_orcamento_id_idx" ON "lancamentos_financeiros" ("orcamento_id");
CREATE INDEX IF NOT EXISTS "lancamentos_financeiros_grupo_id_idx" ON "lancamentos_financeiros" ("grupo_id");
