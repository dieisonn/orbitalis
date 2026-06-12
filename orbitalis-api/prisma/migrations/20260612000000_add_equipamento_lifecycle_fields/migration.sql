ALTER TABLE "equipamentos" ADD COLUMN "data_instalacao" TIMESTAMP(3);
ALTER TABLE "equipamentos" ADD COLUMN "condicao" VARCHAR(20);
ALTER TABLE "equipamentos" ADD COLUMN "diagnostico_inicial" TEXT;
ALTER TABLE "equipamentos" ADD COLUMN "valor_aquisicao" DECIMAL(10, 2);
