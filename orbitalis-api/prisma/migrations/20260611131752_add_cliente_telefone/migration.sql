-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "telefone" VARCHAR(20);

-- AlterTable
ALTER TABLE "equipamentos" ALTER COLUMN "modelo" DROP NOT NULL,
ALTER COLUMN "numero_serie" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ordens_servico" ADD COLUMN     "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valor_mao_obra" DECIMAL(10,2),
ADD COLUMN     "valor_pecas" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "especialidade" VARCHAR(100),
ADD COLUMN     "nome" VARCHAR(150),
ADD COLUMN     "telefone" VARCHAR(20);

-- CreateTable
CREATE TABLE "configuracao_empresa" (
    "id" UUID NOT NULL,
    "nome_empresa" VARCHAR(255) NOT NULL,
    "nome_fantasia" VARCHAR(255),
    "logo_url" VARCHAR(512),
    "cor_primaria" VARCHAR(7),
    "cnpj" VARCHAR(18),
    "telefone" VARCHAR(30),
    "endereco" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracao_empresa_pkey" PRIMARY KEY ("id")
);
