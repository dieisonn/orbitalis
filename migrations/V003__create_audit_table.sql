-- V003: Tabela de auditoria de conflitos de sincronização
-- Fonte: schema_blueprint.md §6.4
-- ATENÇÃO: o blueprint menciona esta tabela na diretriz 6.4 mas não define
-- formalmente suas colunas. Estrutura mínima inferida da narrativa:
--   "salvar o payload rejeitado do técnico" + FK para a O.S. envolvida.
-- Revisar com o autor do blueprint antes de adicionar colunas.

CREATE TABLE auditoria_conflitos_sincronizacao (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_servico_id  UUID      NOT NULL REFERENCES ordens_servico(id),
    payload_rejeitado JSONB     NOT NULL,
    criado_em         TIMESTAMP NOT NULL DEFAULT NOW()
);
