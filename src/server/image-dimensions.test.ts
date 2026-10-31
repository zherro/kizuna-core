import { describe, it, expect } from 'vitest';
import { readImageDimensions } from './image-dimensions';

/** PNG: assinatura + chunk IHDR (só o cabeçalho importa pro parser). */
function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(0x0d0a1a0a, 4);
  buf.writeUInt32BE(13, 8); // length do IHDR
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/** GIF89a: header de 13 bytes, width/height little-endian nos offsets 6/8. */
function gifHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(13);
  buf.write('GIF89a', 0, 'ascii');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

/** JPEG: SOI + um segmento APP0 curto + SOF0 com as dimensões. */
function jpegHeader(width: number, height: number): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
  const sof0 = Buffer.alloc(11);
  sof0.writeUInt16BE(0xffc0, 0);
  sof0.writeUInt16BE(8, 2); // seg length
  sof0.writeUInt8(8, 4); // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof0]);
}

/** WebP VP8X (estendido): dimensões como (valor-1) em 24-bit LE nos offsets 24/27. */
function webpVp8x(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8X', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  const w = width - 1;
  const h = height - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

describe('readImageDimensions', () => {
  it('lê PNG', () => {
    expect(readImageDimensions(pngHeader(1920, 1080), 'image/png')).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('lê GIF', () => {
    expect(readImageDimensions(gifHeader(320, 240), 'image/gif')).toEqual({
      width: 320,
      height: 240,
    });
  });

  it('lê JPEG (varrendo até o SOF0)', () => {
    expect(readImageDimensions(jpegHeader(800, 600), 'image/jpeg')).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('lê WebP VP8X', () => {
    expect(readImageDimensions(webpVp8x(2048, 1536), 'image/webp')).toEqual({
      width: 2048,
      height: 1536,
    });
  });

  it('decide pela assinatura, não pelo mime informado', () => {
    expect(readImageDimensions(pngHeader(100, 50), 'image/jpeg')).toEqual({
      width: 100,
      height: 50,
    });
  });

  it('funciona sem mime', () => {
    expect(readImageDimensions(pngHeader(10, 10))).toEqual({ width: 10, height: 10 });
  });

  it('retorna null pra buffer não-imagem', () => {
    expect(readImageDimensions(Buffer.from('não sou uma imagem'), 'text/plain')).toBeNull();
  });

  it('retorna null pra cabeçalho truncado', () => {
    expect(readImageDimensions(pngHeader(10, 10).subarray(0, 12), 'image/png')).toBeNull();
  });
});
