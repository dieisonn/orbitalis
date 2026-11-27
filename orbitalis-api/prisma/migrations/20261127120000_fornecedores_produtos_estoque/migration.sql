-- Suprimentos: fornecedores, produtos com estoque, movimentos e catálogo de serviços (aditivo, idempotente)
CREATE TABLE IF NOT EXISTS "fornecedores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "numero" SERIAL NOT NULL,
  "tipo_pessoa" VARCHAR(1) NOT NULL DEFAULT 'J',
  "razao_social" VARCHAR(255) NOT NULL,
  "nome_fantasia" VARCHAR(255),
  "cpf_cnpj" VARCHAR(18),
  "inscricao_estadual" VARCHAR(30),
  "email" VARCHAR(255),
  "telefone" VARCHAR(30),
  "celular" VARCHAR(30),
  "contato" VARCHAR(120),
  "cep" VARCHAR(9),
  "logradouro" VARCHAR(255),
  "numero_endereco" VARCHAR(20),
  "complemento" VARCHAR(120),
  "bairro" VARCHAR(120),
  "cidade" VARCHAR(120),
  "uf" VARCHAR(2),
  "observacoes" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fornecedores_empresa_id_numero_key" ON "fornecedores" ("empresa_id", "numero");
CREATE INDEX IF NOT EXISTS "fornecedores_empresa_id_idx" ON "fornecedores" ("empresa_id");

CREATE TABLE IF NOT EXISTS "produtos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "numero" SERIAL NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "codigo_interno" VARCHAR(60),
  "codigo_barras" VARCHAR(60),
  "marca" VARCHAR(100),
  "categoria" VARCHAR(80),
  "unidade" VARCHAR(20) NOT NULL DEFAULT 'un',
  "ncm" VARCHAR(10),
  "preco_custo" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "preco_venda" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "controla_estoque" BOOLEAN NOT NULL DEFAULT true,
  "saldo" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "estoque_minimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "localizacao" VARCHAR(120),
  "fornecedor_padrao_id" UUID,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "produtos_empresa_id_numero_key" ON "produtos" ("empresa_id", "numero");
CREATE INDEX IF NOT EXISTS "produtos_empresa_id_idx" ON "produtos" ("empresa_id");
DO $$ BEGIN
  ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedor_padrao_id_fkey"
    FOREIGN KEY ("fornecedor_padrao_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "movimentos_estoque" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "produto_id" UUID NOT NULL,
  "tipo" VARCHAR(10) NOT NULL,
  "motivo" VARCHAR(30) NOT NULL,
  "delta" DECIMAL(14,3) NOT NULL,
  "saldo_apos" DECIMAL(14,3) NOT NULL,
  "custo_unitario" DECIMAL(12,2),
  "fornecedor_id" UUID,
  "documento" VARCHAR(60),
  "ordem_servico_id" UUID,
  "orcamento_id" UUID,
  "observacao" TEXT,
  "usuario_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "movimentos_estoque_empresa_id_criado_em_idx" ON "movimentos_estoque" ("empresa_id", "criado_em");
CREATE INDEX IF NOT EXISTS "movimentos_estoque_produto_id_criado_em_idx" ON "movimentos_estoque" ("produto_id", "criado_em");
DO $$ BEGIN
  ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_produto_id_fkey"
    FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_fornecedor_id_fkey"
    FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "servicos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID,
  "numero" SERIAL NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "unidade" VARCHAR(20) NOT NULL DEFAULT 'un',
  "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tipo_servico_id" UUID,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "servicos_empresa_id_numero_key" ON "servicos" ("empresa_id", "numero");
CREATE INDEX IF NOT EXISTS "servicos_empresa_id_idx" ON "servicos" ("empresa_id");
