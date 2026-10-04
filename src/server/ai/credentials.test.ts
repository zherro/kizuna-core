import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceTable = vi.fn();
let access = true;
vi.mock('../service-db', () => ({
  hasServiceAccess: () => access,
  serviceTable: (...a: unknown[]) => serviceTable(...a),
}));

import {
  decryptSecret,
  encryptSecret,
  getProviderKey,
  getSecretKey,
  saveProviderKey,
} from './credentials';

const ORIG = { ...process.env };
beforeEach(() => {
  serviceTable.mockReset();
  access = true;
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
  it('usa a credencial ativa do banco (decifrada)', async () => {
    const cipher = encryptSecret('db-key');
    serviceTable.mockResolvedValue(new Response(JSON.stringify([{ key_cipher: cipher }])));
    process.env.ANTHROPIC_API_KEY = 'env-key';
    expect(await getProviderKey('claude')).toBe('db-key');
    expect(serviceTable.mock.calls[0][0]).toContain('provider=eq.claude');
  });

  it('sem linha no banco → env', async () => {
    serviceTable.mockResolvedValue(new Response('[]'));
    process.env.ANTHROPIC_API_KEY = 'env-key';
    expect(await getProviderKey('claude')).toBe('env-key');
  });

  it('sem service access → env, sem tocar o banco', async () => {
    access = false;
    process.env.GEMINI_API_KEY = 'g';
    expect(await getProviderKey('gemini')).toBe('g');
    expect(serviceTable).not.toHaveBeenCalled();
  });

  it('nada configurado → null', async () => {
    serviceTable.mockResolvedValue(new Response('[]'));
    expect(await getProviderKey('claude')).toBeNull();
  });
});

describe('saveProviderKey', () => {
  it('grava cifrada com last4 e só depois desativa as anteriores (exceto a nova)', async () => {
    serviceTable
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 5 }]), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const r = await saveProviderKey('claude', 'principal', 'sk-ant-abcd1234');
    expect(r).toEqual({ id: 5, last4: '1234' });
    expect(serviceTable.mock.calls[0][1].method).toBe('POST');
    const body = JSON.parse(serviceTable.mock.calls[0][1].body);
    expect(body.key_last4).toBe('1234');
    expect(body.key_cipher).not.toContain('abcd1234');
    expect(decryptSecret(body.key_cipher)).toBe('sk-ant-abcd1234');
    expect(serviceTable.mock.calls[1][1].method).toBe('PATCH');
    expect(serviceTable.mock.calls[1][0]).toContain('id=neq.5');
  });

  it('se a gravação falha, não desativa a chave anterior', async () => {
    serviceTable.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(saveProviderKey('claude', 'x', 'sk-ant-abcd1234')).rejects.toThrow(/gravar credencial/);
    expect(serviceTable).toHaveBeenCalledTimes(1);
  });

  it('a mensagem de erro nunca contém a chave', async () => {
    serviceTable.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(saveProviderKey('claude', 'x', 'sk-ant-SEGREDO9999')).rejects.not.toThrow(/SEGREDO/);
  });
});
