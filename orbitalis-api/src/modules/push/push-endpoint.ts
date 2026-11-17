/**
 * O servidor envia uma requisição HTTP para o endereço da assinatura. Para impedir que alguém
 * use isso para alcançar a rede interna (SSRF), só aceitamos os serviços de push dos navegadores.
 */
const HOSTS_PERMITIDOS = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
];
const SUFIXOS_PERMITIDOS = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'];

export function endpointDePushValido(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string' || endpoint.length > 600) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  return HOSTS_PERMITIDOS.includes(host) || SUFIXOS_PERMITIDOS.some((s) => host.endsWith(s));
}
