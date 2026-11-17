import { endpointDePushValido } from './push-endpoint';

describe('endpointDePushValido (proteção contra SSRF)', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ])('aceita %s', (u) => expect(endpointDePushValido(u)).toBe(true));

  it.each([
    'http://127.0.0.1:9/x',
    'http://localhost/x',
    'https://localhost/x',
    'http://fcm.googleapis.com/x',
    'https://169.254.169.254/latest/meta-data',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evil.com/fcm.googleapis.com',
    'https://user:pw@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'ftp://fcm.googleapis.com/x',
    'não é url',
    '',
  ])('recusa %s', (u) => expect(endpointDePushValido(u)).toBe(false));

  it('recusa valores que não são texto', () => {
    expect(endpointDePushValido(undefined)).toBe(false);
    expect(endpointDePushValido(123)).toBe(false);
    expect(endpointDePushValido({})).toBe(false);
  });

  it('recusa endereço enorme', () => {
    expect(endpointDePushValido('https://fcm.googleapis.com/' + 'a'.repeat(700))).toBe(false);
  });
});
