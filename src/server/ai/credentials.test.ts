import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const aiRpc = vi.fn();
vi.mock('./db', () => ({
  aiRpc: (...a: unknown[]) => aiRpc(...a),
}));

const db = { accessToken: 'jwt-do-root' };

import {
  decryptSecret,
  encryptSecret,
  getProviderKey,
  getSecretKey,
  saveProviderKey,
} from './credentials';

const ORIG = { ...process.env };
beforeEach(() => {
  aiRpc.mockReset();
  process.env.AI_SECRET_KEY = Buffer.alloc(32, 7).toString('base64');
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
});
afterEach(() => {
  process.env = { ...ORIG };
});

describe('cifra AES-256-GCM', () => {
  it('cifra e decifra (ida e volta), IV aleatório', () => {
    const a = encryptSecret('sk-ant-segredo');
    const b = encryptSecret('sk-ant-segredo');
    expect(a).not.toEqual(b);
    expect(a).not.toContain('sk-ant');
    expect(decryptSecret(a)).toBe('sk-ant-segredo');
  });

  it('passphrase qualquer é derivada por scrypt', () => {
    process.env.AI_SECRET_KEY = 'uma frase longa qualquer';
    expect(getSecretKey().length).toBe(32);
    expect(decryptSecret(encryptSecret('x'))).toBe('x');
  });

  it('chave errada falha com AiUnavailableError', () => {
    const c = encryptSecret('abc');
    process.env.AI_SECRET_KEY = Buffer.alloc(32, 9).toString('base64');
    expect(() => decryptSecret(c)).toThrow(/decifrar/);
  });

  it('sem AI_SECRET_KEY → AiUnavailableError blocked', () => {
    delete process.env.AI_SECRET_KEY;
    try {
      encryptSecret('x');
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ name: 'AiUnavailableError', reason: 'blocked' });
    }
  });
});

describe('getProviderKey', () => {
  it('usa a credencial ativa do banco (decifrada) via RPC com o JWT do usuário', async () => {
    const cipher = encryptSecret('db-key');
    aiRpc.mockResolvedValue(new Response(JSON.stringify(cipher)));
    process.env.ANTHROPIC_API_KEY = 'env-key';
    expect(await getProviderKey('claude', db)).toBe('db-key');
    expect(aiRpc).toHaveBeenCalledWith(db, 'fn_ai_credential_get_cipher', { p_provider: 'claude' });
  });

  it('RPC devolve null → env', async () => {
    aiRpc.mockResolvedValue(new Response('null'));
    process.env.ANTHROPIC_API_KEY = 'env-key';
    expect(await getProviderKey('claude', db)).toBe('env-key');
  });

  it('RPC negada (não root) → env', async () => {
    aiRpc.mockResolvedValue(new Response('{"message":"forbidden"}', { status: 403 }));
    process.env.GEMINI_API_KEY = 'g';
    expect(await getProviderKey('gemini', db)).toBe('g');
  });

  it('sem db → env, sem tocar o banco', async () => {
    process.env.GEMINI_API_KEY = 'g';
    expect(await getProviderKey('gemini')).toBe('g');
    expect(aiRpc).not.toHaveBeenCalled();
  });

  it('nada configurado → null', async () => {
    aiRpc.mockResolvedValue(new Response('null'));
    expect(await getProviderKey('claude', db)).toBeNull();
  });
});

describe('saveProviderKey', () => {
  it('grava cifrada com last4 pela RPC fn_ai_credential_save', async () => {
    aiRpc.mockResolvedValueOnce(new Response('5'));
    const r = await saveProviderKey(db, 'claude', 'principal', 'sk-ant-abcd1234');
    expect(r).toEqual({ id: 5, last4: '1234' });
    expect(aiRpc).toHaveBeenCalledTimes(1);
    const [calledDb, name, body] = aiRpc.mock.calls[0];
    expect(calledDb).toBe(db);
    expect(name).toBe('fn_ai_credential_save');
    expect(body.p_provider).toBe('claude');
    expect(body.p_label).toBe('principal');
    expect(body.p_key_last4).toBe('1234');
    expect(body.p_key_cipher).not.toContain('abcd1234');
    expect(decryptSecret(body.p_key_cipher)).toBe('sk-ant-abcd1234');
  });

  it('falha da RPC vira erro', async () => {
    aiRpc.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(saveProviderKey(db, 'claude', 'x', 'sk-ant-abcd1234')).rejects.toThrow(/gravar credencial/);
  });

  it('a mensagem de erro nunca contém a chave', async () => {
    aiRpc.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(saveProviderKey(db, 'claude', 'x', 'sk-ant-SEGREDO9999')).rejects.not.toThrow(/SEGREDO/);
  });
});
