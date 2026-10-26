/**
 * Criptografia simétrica do app (AES-256-GCM) para dados que viajam em links — ex.: o código de
 * verificação de e-mail no `#` da URL. O conteúdo fica ilegível e à prova de adulteração, carrega
 * a validade e o propósito (um token de um fluxo não abre em outro).
 *
 * Chave: `APP_ENCRYPTION_KEY` (32 bytes em base64url — `node kizuna-core/cli install|update` cria
 * no `.env` se faltar). Sem ela, deriva uma chave do `PGRST_JWT_SECRET` (HKDF), para nunca ficar
 * sem: trocar qualquer um dos dois invalida os links já enviados.
 */

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 'v1';

function appKey(): Buffer {
  const configured = process.env.APP_ENCRYPTION_KEY?.trim();
  if (configured) {
    const key = Buffer.from(configured, 'base64url');
    if (key.length !== 32) {
      throw new Error('APP_ENCRYPTION_KEY precisa ter 32 bytes em base64url (43 caracteres).');
    }
    return key;
  }
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Defina APP_ENCRYPTION_KEY (ou PGRST_JWT_SECRET, de onde ela é derivada).');
  }
  return Buffer.from(hkdfSync('sha256', secret, 'kizuna', 'kizuna:app-encryption:v1', 32));
}

/** Gera uma chave nova (32 bytes, base64url) para `APP_ENCRYPTION_KEY`. */
export function generateAppEncryptionKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Sela `data` num token opaco (base64url) válido por `ttlSeconds`, amarrado a `purpose`.
 * O `purpose` entra como dado autenticado (AAD): abrir com outro propósito falha.
 */
export function sealToken(purpose: string, data: unknown, ttlSeconds: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', appKey(), iv);
  cipher.setAAD(Buffer.from(`${VERSION}:${purpose}`));
  const body = JSON.stringify({ d: data, e: Math.floor(Date.now() / 1000) + ttlSeconds });
  const encrypted = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

/** Abre um token de `sealToken`. Devolve `null` se for inválido, adulterado, de outro propósito ou vencido. */
export function openToken<T = unknown>(purpose: string, token: string): T | null {
  const [version, iv, encrypted, tag] = String(token ?? '').split('.');
  if (version !== VERSION || !iv || !encrypted || !tag) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', appKey(), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(`${VERSION}:${purpose}`));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(plain) as { d: T; e: number };
    if (typeof parsed.e !== 'number' || parsed.e < Math.floor(Date.now() / 1000)) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

/**
 * Cifra um texto sensível (ex.: IP) num token opaco, SEM validade — para dado guardado, não link.
 * Mesmo formato versionado do `sealToken`; o `purpose` entra como AAD (com prefixo próprio, então
 * um token de `sealToken` nunca abre aqui nem o contrário). IV aleatório: cada cifra é diferente.
 */
export function encryptValue(purpose: string, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', appKey(), iv);
  cipher.setAAD(Buffer.from(`${VERSION}:value:${purpose}`));
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

/** Abre um token de `encryptValue`. Devolve `null` se for inválido, adulterado ou de outro propósito. */
export function decryptValue(purpose: string, token: string): string | null {
  const [version, iv, encrypted, tag] = String(token ?? '').split('.');
  if (version !== VERSION || !iv || !encrypted || !tag) return null;
  try {
    // Tag de 16 bytes obrigatório: tag truncada é rejeitada (lança → null).
    const decipher = createDecipheriv('aes-256-gcm', appKey(), Buffer.from(iv, 'base64url'), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(`${VERSION}:value:${purpose}`));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * HMAC-SHA256 (hex, 64 caracteres) determinístico de `plain`, para agrupar/contar sem guardar o
 * valor. A subchave vem do HKDF da chave do app (info `kizuna:hmac:<purpose>`) — a chave crua
 * nunca é usada direto no HMAC, e cada propósito tem a sua.
 */
export function hmacValue(purpose: string, plain: string): string {
  const subkey = Buffer.from(hkdfSync('sha256', appKey(), 'kizuna', `kizuna:hmac:${purpose}`, 32));
  return createHmac('sha256', subkey).update(String(plain), 'utf8').digest('hex');
}
