-- CreateTable
CREATE TABLE "planos_manutencao" (
    "id" UUID NOT NULL,
    "ambiente_id" UUID NOT NULL,
    "tecnico_id" UUID,
    "modelo_checklist_id" UUID,
    "frequencia_dias" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "proxima_geracao" TIMESTAMP(3) NOT NULL,
    "ultima_geracao" TIMESTAMP(3),

    CONSTRAINT "planos_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_manutencao_proxima_geracao_ativo_idx" ON "planos_manutencao"("proxima_geracao", "ativo");

-- AddForeignKey
ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_modelo_checklist_id_fkey" FOREIGN KEY ("modelo_checklist_id") REFERENCES "modelos_checklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
