-- O mesmo CNPJ/CPF pode ser cliente de duas empresas diferentes: unicidade passa a ser POR empresa
DROP INDEX IF EXISTS "clientes_documento_key";
CREATE UNIQUE INDEX IF NOT EXISTS "clientes_empresa_id_documento_key" ON "clientes"("empresa_id", "documento");
