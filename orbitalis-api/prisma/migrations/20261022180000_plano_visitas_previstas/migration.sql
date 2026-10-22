-- Visitas por equipamento incluídas no plano preventivo (limita a geração de O.S.)
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "visitas_previstas" INTEGER;
ALTER TABLE "planos_manutencao" ADD COLUMN IF NOT EXISTS "visitas_geradas" INTEGER NOT NULL DEFAULT 0;

-- Planos que já existem: conta as visitas (datas distintas) que já têm O.S. não cancelada,
-- para que o limite, quando for informado, parta do que já foi gerado.
UPDATE "planos_manutencao" p
SET "visitas_geradas" = COALESCE((
  SELECT COUNT(DISTINCT o."data_agendamento")
  FROM "ordens_servico" o
  WHERE o."plano_id" = p."id" AND o."status" <> 'cancelada'
), 0)
WHERE p."visitas_geradas" = 0;
