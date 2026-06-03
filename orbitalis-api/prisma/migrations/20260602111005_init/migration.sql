-- CreateEnum
CREATE TYPE "UsuarioTipo" AS ENUM ('admin', 'tecnico', 'cliente');

-- CreateEnum
CREATE TYPE "OsStatus" AS ENUM ('aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "OsOrigem" AS ENUM ('manual_admin', 'preventiva_automatica', 'portal_cliente');

-- CreateEnum
CREATE TYPE "OsItemStatus" AS ENUM ('pendente', 'concluido');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "tipo" "UsuarioTipo" NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "documento" VARCHAR(14) NOT NULL,
    "razao_social" VARCHAR(255) NOT NULL,
    "nome_fantasia" VARCHAR(255),
    "endereco" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "metros_quadrados" DECIMAL(10,2) NOT NULL,
    "capacidade_termica" VARCHAR(50) NOT NULL,
    "localizacao_interna" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL,
    "ambiente_id" UUID NOT NULL,
    "codigo_qr" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "marca" VARCHAR(100) NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "numero_serie" VARCHAR(100) NOT NULL,
    "tipo_equipamento" VARCHAR(100) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_checklist" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "itens" JSONB NOT NULL,

    CONSTRAINT "modelos_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" UUID NOT NULL,
    "ambiente_id" UUID NOT NULL,
    "tecnico_id" UUID,
    "status" "OsStatus" NOT NULL,
    "origem" "OsOrigem" NOT NULL,
    "assinatura_url" VARCHAR(512),
    "observacoes_gerais" TEXT,
    "data_agendamento" TIMESTAMP(3) NOT NULL,
    "data_inicio" TIMESTAMP(3),
    "data_conclusao" TIMESTAMP(3),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_itens" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "equipamento_id" UUID NOT NULL,
    "status_item" "OsItemStatus" NOT NULL DEFAULT 'pendente',
    "checklist_snapshot" JSONB NOT NULL,
    "observacoes_tecnicas" TEXT,

    CONSTRAINT "ordem_servico_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_conflitos_sincronizacao" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "payload_rejeitado" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_conflitos_sincronizacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_usuario_id_key" ON "clientes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_codigo_qr_key" ON "equipamentos"("codigo_qr");

-- CreateIndex
CREATE INDEX "equipamentos_codigo_qr_idx" ON "equipamentos"("codigo_qr");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_itens" ADD CONSTRAINT "ordem_servico_itens_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_itens" ADD CONSTRAINT "ordem_servico_itens_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_conflitos_sincronizacao" ADD CONSTRAINT "auditoria_conflitos_sincronizacao_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
