import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GeminiProvider } from './gemini';
import { NotImplementedProvider } from './not-implemented';
import { AiUnavailableError } from '../errors';

const okBody = { candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] };
const req = { systemPrompt: 's', contents: [], schema: {}, timeoutMs: 1000 };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('GeminiProvider', () => {
  it('200 → objeto parseado', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => okBody });
    const p = new GeminiProvider({ apiKey: 'k', model: 'm' });
    expect(await p.generateStructured(req)).toEqual({ a: 1 });
  });

  it('429 → AiUnavailableError (/quota/)', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'quota exceeded' } }),
    });
    const p = new GeminiProvider({ apiKey: 'k', model: 'm' });
    await expect(p.generateStructured(req)).rejects.toThrow(/quota/);
    await expect(p.generateStructured(req)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it('corpo não-JSON → AiUnavailableError (/inesperado/i)', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'xoxo' }] } }] }),
    });
    const p = new GeminiProvider({ apiKey: 'k', model: 'm' });
    await expect(p.generateStructured(req)).rejects.toThrow(/inesperado/i);
  });
});

describe('NotImplementedProvider', () => {
  it('sempre lança blocked', async () => {
    await expect(new NotImplementedProvider('openai').generateStructured()).rejects.toMatchObject({
      reason: 'blocked',
    });
  });
});
