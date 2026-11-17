import { bytesDeImagemValidos } from './foto-bytes';

const pad = (b: number[]) => Buffer.concat([Buffer.from(b), Buffer.alloc(20)]);

describe('bytesDeImagemValidos', () => {
  it('aceita JPEG, PNG e WebP verdadeiros', () => {
    expect(bytesDeImagemValidos(pad([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true);
    expect(bytesDeImagemValidos(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);
    expect(bytesDeImagemValidos(webp, 'image/webp')).toBe(true);
  });
  it('recusa bytes que não são imagem', () => {
    expect(bytesDeImagemValidos(Buffer.from('AAAA', 'base64'), 'image/png')).toBe(false);
    expect(bytesDeImagemValidos(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/png')).toBe(false);
  });
  it('recusa tipo declarado diferente do conteúdo', () => {
    expect(bytesDeImagemValidos(pad([0xff, 0xd8, 0xff, 0xe0]), 'image/png')).toBe(false);
  });
  it('recusa tipo desconhecido', () => {
    expect(bytesDeImagemValidos(pad([0xff, 0xd8, 0xff, 0xe0]), 'image/gif')).toBe(false);
  });
});
