/**
 * Credenciais de IA gerenciáveis pelo root: chave do provedor cifrada em `public.ai_credentials`
 * (AES-256-GCM no Node, segredo `AI_SECRET_KEY`), com fallback para env (`GEMINI_API_KEY`,
 * `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). Leitura e gravação passam pelas RPCs
 * `fn_ai_credential_get_cipher` / `fn_ai_credential_save` com o JWT do usuário (só root).
 * A chave em claro nunca é logada nem devolvida a clientes.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { aiRpc, type AiUserDb } from './db';
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

async function readActiveCipher(db: AiUserDb, provider: string): Promise<string | null> {
  try {
    const res = await aiRpc(db, 'fn_ai_credential_get_cipher', { p_provider: provider });
    if (!res.ok) return null;
    const cipher = (await res.json()) as unknown;
    return typeof cipher === 'string' && cipher ? cipher : null;
  } catch {
    return null;
  }
}

/**
 * Chave do provider: `ai_credentials` ativa (decifrada, só com `db` de root) → env → `null`.
 * Sem `db` (ex.: chamadas fora do fluxo do root) usa só o env.
 */
export async function getProviderKey(provider: string, db?: AiUserDb | null): Promise<string | null> {
  if (db) {
    const cipher = await readActiveCipher(db, provider);
    if (cipher) return decryptSecret(cipher);
  }
  return envKeyFor(provider) || null;
}

/**
 * Cifra e grava a chave pela RPC (que desativa as anteriores do mesmo provider na mesma transação).
 * Guarda só os 4 últimos dígitos em claro.
 */
export async function saveProviderKey(
  db: AiUserDb,
  provider: AiProviderId,
  label: string,
  key: string
): Promise<{ id: number | string | null; last4: string }> {
  const clean = String(key ?? '').trim();
  if (!clean) throw new Error('Chave vazia.');
  const cipher = encryptSecret(clean); // falha cedo se AI_SECRET_KEY ausente
  const last4 = clean.slice(-4);

  const res = await aiRpc(db, 'fn_ai_credential_save', {
    p_provider: provider,
    p_label: label,
    p_key_cipher: cipher,
    p_key_last4: last4,
  });
  if (!res.ok) throw new Error(`Falha ao gravar credencial (${res.status}).`);
  const id = (await res.json().catch(() => null)) as number | string | null;
  return { id: id ?? null, last4 };
}
