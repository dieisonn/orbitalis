-- Isolamento por empresa (multi-tenant) passa a valer de fato.
-- Até aqui o filtro automático não era aplicado (nome do model em maiúscula), então as linhas
-- foram gravadas sem empresa_id. Este script atribui as linhas legadas à empresa "dona" dos dados:
-- a do usuário mais antigo do sistema (ou uma empresa "principal", se ele não tinha empresa).

DO $$
DECLARE
  alvo UUID;
  t TEXT;
BEGIN
  SELECT empresa_id INTO alvo FROM usuarios ORDER BY data_criacao ASC LIMIT 1;

  IF alvo IS NULL AND EXISTS (SELECT 1 FROM usuarios) THEN
    INSERT INTO empresas (id, slug, nome_empresa, plano)
    VALUES (gen_random_uuid(), 'principal', 'Empresa principal', 'basico')
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO alvo FROM empresas WHERE slug = 'principal';
  END IF;

  IF alvo IS NOT NULL THEN
    FOREACH t IN ARRAY ARRAY[
      'usuarios','clientes','ambientes','equipamentos','modelos_checklist','planos_manutencao',
      'ordens_servico','tipos_servico','configuracao_empresa','alerta_config','alerta_ocorrencias',
      'orcamentos','contratos','convites'
    ] LOOP
      EXECUTE format('UPDATE %I SET empresa_id = $1 WHERE empresa_id IS NULL', t) USING alvo;
    END LOOP;
  END IF;
END $$;

-- Sigla do tipo de serviço passa a ser única POR empresa (cada empresa tem o seu catálogo)
DROP INDEX IF EXISTS "tipos_servico_sigla_key";
CREATE UNIQUE INDEX IF NOT EXISTS "tipos_servico_empresa_id_sigla_key" ON "tipos_servico"("empresa_id", "sigla");

-- Índices de tenant nas tabelas mais consultadas
CREATE INDEX IF NOT EXISTS "ordens_servico_empresa_id_idx" ON "ordens_servico"("empresa_id");
CREATE INDEX IF NOT EXISTS "clientes_empresa_id_idx" ON "clientes"("empresa_id");
CREATE INDEX IF NOT EXISTS "equipamentos_empresa_id_idx" ON "equipamentos"("empresa_id");
CREATE INDEX IF NOT EXISTS "ambientes_empresa_id_idx" ON "ambientes"("empresa_id");
