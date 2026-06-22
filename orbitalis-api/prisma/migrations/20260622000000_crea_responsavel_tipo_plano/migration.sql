-- Adiciona campo CREA ao técnico
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "crea" VARCHAR(20);

-- Adiciona responsável técnico à configuração da empresa
ALTER TABLE "configuracao_empresa"
  ADD COLUMN IF NOT EXISTS "responsavel_tecnico_id" UUID;

ALTER TABLE "configuracao_empresa"
  ADD CONSTRAINT "configuracao_empresa_responsavel_tecnico_id_fkey"
  FOREIGN KEY ("responsavel_tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;

-- Adiciona tipo de serviço ao plano de manutenção
ALTER TABLE "planos_manutencao"
  ADD COLUMN IF NOT EXISTS "tipo_servico_id" UUID;

ALTER TABLE "planos_manutencao"
  ADD CONSTRAINT "planos_manutencao_tipo_servico_id_fkey"
  FOREIGN KEY ("tipo_servico_id") REFERENCES "tipos_servico"("id") ON DELETE SET NULL;
