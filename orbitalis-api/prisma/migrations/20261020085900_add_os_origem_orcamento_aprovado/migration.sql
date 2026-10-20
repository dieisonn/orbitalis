-- Nova origem de O.S.: gerada a partir de um orçamento aprovado.
-- (migração separada: ALTER TYPE ... ADD VALUE é mais seguro fora de outras alterações)
ALTER TYPE "OsOrigem" ADD VALUE IF NOT EXISTS 'orcamento_aprovado';
