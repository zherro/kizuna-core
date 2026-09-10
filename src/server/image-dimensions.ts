/**
 * Leitura das dimensões (largura × altura) de uma imagem direto do cabeçalho do arquivo.
 *
 * Puro, síncrono, zero dependência — parseia só os bytes iniciais de PNG / JPEG / GIF / WebP.
 * Serve pro fluxo de upload gravar `files.width` / `files.height` sem carregar `sharp`.
 * Formato desconhecido ou cabeçalho truncado → `null` (o upload nunca quebra por causa disso).
 */

export type ImageDimensions = { width: number; height: number };

/** PNG: assinatura de 8 bytes + chunk IHDR com width/height em big-endian nos offsets 16 e 20. */
function png(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24) return null;
  const sig = buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a;
  if (!sig) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** GIF: "GIF87a"/"GIF89a" + width/height em little-endian nos offsets 6 e 8. */
function gif(buf: Buffer): ImageDimensions | null {
  if (buf.length < 10) return null;
  const header = buf.toString('ascii', 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/** WebP: container RIFF; três variantes (VP8 lossy, VP8L lossless, VP8X estendido). */
function webp(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const format = buf.toString('ascii', 12, 16);
  if (format === 'VP8 ') {
    // frame tag de 3 bytes, depois 0x9d012a, depois width|height 14-bit little-endian.
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return {
      width: (b & 0x3fff) + 1,
      height: ((b >> 14) & 0x3fff) + 1,
    };
  }
  if (format === 'VP8X') {
    // width-1 e height-1 em 24-bit little-endian nos offsets 24 e 27.
    const w = buf[24]! | (buf[25]! << 8) | (buf[26]! << 16);
    const h = buf[27]! | (buf[28]! << 8) | (buf[29]! << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

/** JPEG: varre os segmentos até um marcador SOF (0xC0–0xCF, exceto C4/C8/CC). */
function jpeg(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1]!;
    // marcadores sem payload (RSTn, SOI, EOI, TEM): pula.
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      offset += 2;
      continue;
    }
    const segLen = buf.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 >= buf.length) return null;
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + segLen;
  }
  return null;
}

/**
 * Tenta ler as dimensões de `buffer`. `mimeType` só reordena as tentativas — o parse real
 * decide pela assinatura de bytes, então um mime errado não engana o resultado.
 */
export function readImageDimensions(
  buffer: Buffer,
  mimeType?: string | null
): ImageDimensions | null {
  const parsers = [png, jpeg, gif, webp];
  const mime = mimeType?.trim().toLowerCase() ?? '';
  if (mime.includes('png')) parsers.unshift(png);
  else if (mime.includes('jpeg') || mime.includes('jpg')) parsers.unshift(jpeg);
  else if (mime.includes('gif')) parsers.unshift(gif);
  else if (mime.includes('webp')) parsers.unshift(webp);

  for (const parse of parsers) {
    try {
      const result = parse(buffer);
      if (result && result.width > 0 && result.height > 0) return result;
    } catch {
      // cabeçalho truncado / inesperado — tenta o próximo parser
    }
  }
  return null;
}
