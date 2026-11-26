-- Motivo documentado do cancelamento da O.S.
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "cancelamento_motivo" VARCHAR(30);
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "cancelamento_detalhe" TEXT;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "cancelada_em" TIMESTAMP(3);
-- O.S. já canceladas: a data do cancelamento é a do último registro de histórico para "cancelada"
UPDATE "ordens_servico" o SET "cancelada_em" = h.ocorrido_em
FROM (SELECT ordem_servico_id, MAX(ocorrido_em) AS ocorrido_em FROM "ordem_servico_historico" WHERE para_status = 'cancelada' GROUP BY ordem_servico_id) h
WHERE h.ordem_servico_id = o.id AND o.status = 'cancelada' AND o.cancelada_em IS NULL;
