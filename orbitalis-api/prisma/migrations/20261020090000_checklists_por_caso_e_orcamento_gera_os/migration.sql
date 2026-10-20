-- Checklists por caso (tipo + tipo de serviço) e orçamento aprovado gerando O.S.

-- Modelos de checklist: caso de uso
ALTER TABLE "modelos_checklist"
  ADD COLUMN "tipo" "OsTipo",
  ADD COLUMN "tipo_servico_id" UUID;

CREATE INDEX "modelos_checklist_tipo_idx" ON "modelos_checklist"("tipo");

ALTER TABLE "modelos_checklist"
  ADD CONSTRAINT "modelos_checklist_tipo_servico_id_fkey"
  FOREIGN KEY ("tipo_servico_id") REFERENCES "tipos_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Os modelos padrão já existentes (PMOC/ANVISA) são de manutenção preventiva
UPDATE "modelos_checklist" SET "tipo" = 'preventiva'
 WHERE "tipo" IS NULL AND ("nome" LIKE 'PMOC%' OR "nome" LIKE 'ANVISA%');

-- Orçamentos: dados para gerar a O.S. na aprovação
ALTER TABLE "orcamentos"
  ADD COLUMN "ambiente_id" UUID,
  ADD COLUMN "tipo_os" "OsTipo" NOT NULL DEFAULT 'corretiva',
  ADD COLUMN "tipo_servico_id" UUID,
  ADD COLUMN "modelo_checklist_id" UUID,
  ADD COLUMN "ordem_servico_id" UUID;

CREATE UNIQUE INDEX "orcamentos_ordem_servico_id_key" ON "orcamentos"("ordem_servico_id");

ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_ambiente_id_fkey"
  FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_tipo_servico_id_fkey"
  FOREIGN KEY ("tipo_servico_id") REFERENCES "tipos_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_modelo_checklist_id_fkey"
  FOREIGN KEY ("modelo_checklist_id") REFERENCES "modelos_checklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_ordem_servico_id_fkey"
  FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Itens do orçamento: categoria (serviço ou peça)
ALTER TABLE "orcamento_itens"
  ADD COLUMN "categoria" VARCHAR(10) NOT NULL DEFAULT 'servico';
