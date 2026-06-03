-- V002: Tabelas principais
-- Fonte: schema_blueprint.md §4
-- Ordem respeitando dependências de FK

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- usuarios
-- ─────────────────────────────────────────
CREATE TABLE usuarios (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255)  UNIQUE NOT NULL,
    senha_hash    VARCHAR(255)  NOT NULL,
    tipo          usuario_tipo  NOT NULL,
    data_criacao  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- clientes
-- Soft delete: deleted_at (§6.5)
-- ─────────────────────────────────────────
CREATE TABLE clientes (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
    documento     VARCHAR(14)   UNIQUE NOT NULL,
    razao_social  VARCHAR(255)  NOT NULL,
    nome_fantasia VARCHAR(255),
    endereco      TEXT          NOT NULL,
    deleted_at    TIMESTAMP
);

-- ─────────────────────────────────────────
-- ambientes
-- Soft delete: deleted_at (§6.5)
-- ─────────────────────────────────────────
CREATE TABLE ambientes (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id          UUID          NOT NULL REFERENCES clientes(id),
    nome                VARCHAR(100)  NOT NULL,
    metros_quadrados    DECIMAL(10,2) NOT NULL,
    capacidade_termica  VARCHAR(50)   NOT NULL,
    localizacao_interna TEXT          NOT NULL,
    deleted_at          TIMESTAMP
);

-- ─────────────────────────────────────────
-- equipamentos
-- Soft delete: deleted_at (§6.5)
-- ─────────────────────────────────────────
CREATE TABLE equipamentos (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiente_id      UUID         NOT NULL REFERENCES ambientes(id),
    codigo_qr        VARCHAR(50)  UNIQUE NOT NULL,
    nome             VARCHAR(100) NOT NULL,
    marca            VARCHAR(100) NOT NULL,
    modelo           VARCHAR(100) NOT NULL,
    numero_serie     VARCHAR(100) NOT NULL,
    tipo_equipamento VARCHAR(100) NOT NULL,
    deleted_at       TIMESTAMP
);

CREATE INDEX idx_equipamentos_codigo_qr ON equipamentos(codigo_qr);

-- ─────────────────────────────────────────
-- modelos_checklist
-- ─────────────────────────────────────────
CREATE TABLE modelos_checklist (
    id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome  VARCHAR(150) NOT NULL,
    itens JSONB        NOT NULL
);

-- ─────────────────────────────────────────
-- ordens_servico  (tabela pai da O.S.)
-- ─────────────────────────────────────────
CREATE TABLE ordens_servico (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiente_id         UUID        NOT NULL REFERENCES ambientes(id),
    tecnico_id          UUID        REFERENCES usuarios(id),
    status              os_status   NOT NULL,
    origem              os_origem   NOT NULL,
    assinatura_url      VARCHAR(512),
    observacoes_gerais  TEXT,
    data_agendamento    TIMESTAMP   NOT NULL,
    data_inicio         TIMESTAMP,
    data_conclusao      TIMESTAMP
);

CREATE INDEX idx_ordens_servico_status ON ordens_servico(status);

-- ─────────────────────────────────────────
-- ordem_servico_itens  (1 por equipamento do ambiente)
-- ON DELETE CASCADE: ao deletar a O.S. pai, os itens somem junto
-- checklist_snapshot: deep copy do modelo no momento da abertura (§6.2)
-- ─────────────────────────────────────────
CREATE TABLE ordem_servico_itens (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_servico_id     UUID           NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    equipamento_id       UUID           NOT NULL REFERENCES equipamentos(id),
    status_item          os_item_status NOT NULL DEFAULT 'pendente',
    checklist_snapshot   JSONB          NOT NULL,
    observacoes_tecnicas TEXT
);
