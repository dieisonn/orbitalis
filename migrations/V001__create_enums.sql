-- V001: Tipos ENUM do domínio Orbitalis
-- Fonte: schema_blueprint.md §4

CREATE TYPE usuario_tipo AS ENUM (
    'admin',
    'tecnico',
    'cliente'
);

CREATE TYPE os_status AS ENUM (
    'aberta',
    'agendada',
    'em_andamento',
    'concluida',
    'cancelada'
);

CREATE TYPE os_origem AS ENUM (
    'manual_admin',
    'preventiva_automatica',
    'portal_cliente'
);

CREATE TYPE os_item_status AS ENUM (
    'pendente',
    'concluido'
);
