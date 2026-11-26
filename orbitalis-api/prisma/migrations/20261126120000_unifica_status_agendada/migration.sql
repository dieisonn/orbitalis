-- Status unificado: "agendada" passa a ser "aberta" (com ou sem técnico definido).
-- O valor 'agendada' continua existindo no enum apenas por compatibilidade; o sistema não o grava mais.
-- (O histórico antigo de transições é mantido como está.)
UPDATE "ordens_servico" SET "status" = 'aberta' WHERE "status" = 'agendada';
