/**
 * Retorna o segredo usado para assinar/validar JWT.
 * Falha na inicialização se JWT_SECRET não estiver definido, para nunca
 * rodar com um segredo padrão previsível (que permitiria forjar logins).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET não definido. Configure a variável de ambiente (ex.: openssl rand -base64 32).',
    );
  }
  return secret;
}
