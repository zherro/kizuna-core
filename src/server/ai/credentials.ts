/**
 * Credenciais de IA gerenciáveis pelo admin: chave do provedor cifrada em `public.ai_credentials`
 * (AES-256-GCM, segredo `AI_SECRET_KEY`), com fallback para env (`GEMINI_API_KEY`,
 * `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). A chave em claro nunca é logada nem devolvida a clientes.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { hasServiceAccess, serviceTable } from '../service-db';
import { AiUnavailableError } from './errors';

export type AiProviderId = 'gemini' | 'openai' | 'claude';

const ENV_BY_PROVIDER: Record<AiProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

const SCRYPT_SALT = 'kizuna-ai-credentials-v1';
const PREFIX = 'v1';

/** 32 bytes: base64 de 32 bytes é usado direto; qualquer outro valor é derivado por scrypt. */
export function getSecretKey(): Buffer {
  const raw = String(process.env.AI_SECRET_KEY ?? '').trim();
  if (!raw) {
    throw new AiUnavailableError('AI_SECRET_KEY não configurada (necessária para chaves de IA).', {
      reason: 'blocked',
    });
  }
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  }
  return scryptSync(raw, SCRYPT_SALT, 32);
}

export function encryptSecret(plain: string, key: Buffer = getSecretKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptSecret(payload: string, key: Buffer = getSecretKey()): string {
  const [v, iv, tag, ct] = String(payload).split(':');
  if (v !== PREFIX || !iv || !tag || !ct) {
    throw new AiUnavailableError('Credencial de IA em formato inválido.', { reason: 'blocked' });
  }
  try {
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
  } catch {
    throw new AiUnavailableError(
      'Não foi possível decifrar a credencial de IA (AI_SECRET_KEY mudou?).',
      { reason: 'blocked' }
    );
  }
}

export function envKeyFor(provider: string): string {
  const name = ENV_BY_PROVIDER[provider as AiProviderId];
  return name ? String(process.env[name] ?? '').trim() : '';
}

async function readActiveCipher(provider: string): Promise<string | null> {
  if (!hasServiceAccess()) return null;
  try {
    const res = await serviceTable(
      `/ai_credentials?provider=eq.${encodeURIComponent(provider)}&active=eq.true` +
        `&select=key_cipher&order=updated_at.desc&limit=1`
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ key_cipher?: string }>;
    return rows[0]?.key_cipher ?? null;
  } catch {
    return null;
  }
}

/** Chave do provider: `ai_credentials` ativa (decifrada) → env → `null`. */
export async function getProviderKey(provider: string): Promise<string | null> {
  const cipher = await readActiveCipher(provider);
  if (cipher) return decryptSecret(cipher);
  return envKeyFor(provider) || null;
}

/** Cifra e grava a chave; desativa as anteriores do mesmo provider. Guarda só os 4 últimos dígitos em claro. */
export async function saveProviderKey(
  provider: AiProviderId,
  label: string,
  key: string
): Promise<{ id: number | string | null; last4: string }> {
  const clean = String(key ?? '').trim();
  if (!clean) throw new Error('Chave vazia.');
  const cipher = encryptSecret(clean); // falha cedo se AI_SECRET_KEY ausente
  const last4 = clean.slice(-4);

  // Grava a nova ANTES de desativar as antigas: se a gravação falhar, a chave anterior continua valendo.
  const res = await serviceTable('/ai_credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ provider, label, key_cipher: cipher, key_last4: last4, active: true }),
  });
  if (!res.ok) throw new Error(`Falha ao gravar credencial (${res.status}).`);
  const rows = (await res.json().catch(() => [])) as Array<{ id?: number | string }>;
  const newId = rows[0]?.id;

  if (newId != null) {
    const off = await serviceTable(
      `/ai_credentials?provider=eq.${encodeURIComponent(provider)}&active=eq.true&id=neq.${newId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
      }
    );
    if (!off.ok) throw new Error(`Falha ao desativar credencial anterior (${off.status}).`);
  }
  return { id: rows[0]?.id ?? null, last4 };
}
