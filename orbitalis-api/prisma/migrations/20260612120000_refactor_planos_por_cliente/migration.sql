-- Refatoração: planos preventivos por cliente com checklist por equipamento
-- Preserva: clientes, usuarios, modelos_checklist, configuracao_empresa
-- Exclui: ambientes, equipamentos, planos, ordens de servico

-- Limpeza de dados em ordem de dependência
DELETE FROM "auditoria_conflitos_sincronizacao";
DELETE FROM "ordem_servico_itens";
DELETE FROM "ordens_servico";
DELETE FROM "planos_manutencao";
DELETE FROM "equipamentos";
DELETE FROM "ambientes";

-- Remover colunas antigas de planos_manutencao
ALTER TABLE "planos_manutencao" DROP CONSTRAINT IF EXISTS "planos_manutencao_ambiente_id_fkey";
ALTER TABLE "planos_manutencao" DROP CONSTRAINT IF EXISTS "planos_manutencao_modelo_checklist_id_fkey";
ALTER TABLE "planos_manutencao" DROP COLUMN IF EXISTS "ambiente_id";
ALTER TABLE "planos_manutencao" DROP COLUMN IF EXISTS "modelo_checklist_id";

-- Adicionar cliente_id em planos_manutencao (idempotente: IF NOT EXISTS / DROP antes de ADD CONSTRAINT)
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "cliente_id" UUID;
ALTER TABLE "planos_manutencao" ALTER COLUMN "cliente_id" SET NOT NULL;
ALTER TABLE "planos_manutencao" DROP CONSTRAINT IF EXISTS "planos_manutencao_cliente_id_fkey";
ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Adicionar plano_id em ordens_servico (idempotente)
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "plano_id" UUID;
ALTER TABLE "ordens_servico" DROP CONSTRAINT IF EXISTS "ordens_servico_plano_id_fkey";
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_plano_id_fkey"
  FOREIGN KEY ("plano_id") REFERENCES "planos_manutencao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Criar tabela plano_equipamento_config (idempotente)
CREATE TABLE IF NOT EXISTS "plano_equipamento_config" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "plano_id"             UUID NOT NULL,
  "equipamento_id"       UUID NOT NULL,
  "modelo_checklist_id"  UUID,
  CONSTRAINT "plano_equipamento_config_pkey"
    PRIMARY KEY ("id"),
  CONSTRAINT "plano_equipamento_config_plano_id_fkey"
    FOREIGN KEY ("plano_id") REFERENCES "planos_manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "plano_equipamento_config_equipamento_id_fkey"
    FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "plano_equipamento_config_modelo_checklist_id_fkey"
    FOREIGN KEY ("modelo_checklist_id") REFERENCES "modelos_checklist"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "plano_equipamento_config_plano_id_equipamento_id_key"
    UNIQUE ("plano_id", "equipamento_id")
);
