-- O.S. que não é manutenção (visita técnica, reunião...) deixa de ser gravada como "corretiva"
ALTER TYPE "OsTipo" ADD VALUE IF NOT EXISTS 'nao_se_aplica';
