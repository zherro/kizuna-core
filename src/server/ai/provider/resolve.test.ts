import { describe, expect, it, vi, beforeEach } from 'vitest';

const readSystemConfig = vi.fn();
vi.mock('../system-config', () => ({ readSystemConfig: (k: string) => readSystemConfig(k) }));

import { resolveProvider } from './resolve';
import { GeminiProvider } from './gemini';
import { NotImplementedProvider } from './not-implemented';

beforeEach(() => {
  readSystemConfig.mockReset();
  process.env.GEMINI_API_KEY = 'k';
});

describe('resolveProvider', () => {
  it('gemini com chave → GeminiProvider', async () => {
    readSystemConfig.mockImplementation((k: string) =>
      k === 'ai_assistant.provider' ? 'gemini' : 'm',
    );
    expect(await resolveProvider()).toBeInstanceOf(GeminiProvider);
  });

  it('gemini sem chave → AiUnavailableError blocked', async () => {
    delete process.env.GEMINI_API_KEY;
    readSystemConfig.mockResolvedValue('gemini');
    await expect(resolveProvider()).rejects.toMatchObject({ reason: 'blocked' });
  });

  it('openai → NotImplementedProvider', async () => {
    readSystemConfig.mockResolvedValue('openai');
    expect(await resolveProvider()).toBeInstanceOf(NotImplementedProvider);
  });

  it('provider ausente → default gemini', async () => {
    readSystemConfig.mockResolvedValue(null);
    expect(await resolveProvider()).toBeInstanceOf(GeminiProvider);
  });
});
