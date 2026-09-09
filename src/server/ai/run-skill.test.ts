import { describe, expect, it, vi, beforeEach } from 'vitest';

const readSystemConfig = vi.fn();
const generateStructured = vi.fn();
vi.mock('./system-config', () => ({ readSystemConfig: (k: string) => readSystemConfig(k) }));
vi.mock('./provider/resolve', () => ({
  resolveProvider: async () => ({ id: 'gemini', generateStructured }),
}));

import { registerSkill, runSkill } from './index';

const skill = {
  key: 'demo',
  context: 'demo',
  loadContext: vi.fn(async () => ({ tax: 'T' })),
  buildPrompt: (i: unknown, l: unknown) => ({ systemPrompt: 'sp', contents: [i, l] }),
  schema: {},
  validate: (raw: Record<string, unknown>) => ({ clean: raw.x }),
};

describe('runSkill', () => {
  beforeEach(() => {
    readSystemConfig.mockReset();
    generateStructured.mockReset();
    skill.loadContext.mockClear();
    registerSkill(skill as never);
  });

  it('roda a pipeline e devolve output validado', async () => {
    readSystemConfig.mockResolvedValue({}); // contexts vazio → default-on
    generateStructured.mockResolvedValue({ x: 42 });
    const { output } = await runSkill('demo', { q: 1 }, { userId: 'u', tenantId: 't' });
    expect(output).toEqual({ clean: 42 });
    expect(skill.loadContext).toHaveBeenCalled();
  });

  it('contexto desligado → AiUnavailableError blocked', async () => {
    readSystemConfig.mockResolvedValue({ demo: false });
    await expect(
      runSkill('demo', {}, { userId: 'u', tenantId: 't' }),
    ).rejects.toMatchObject({ reason: 'blocked' });
  });

  it('skill não registrada → erro', async () => {
    await expect(runSkill('zzz', {}, { userId: 'u', tenantId: 't' })).rejects.toThrow(/zzz/);
  });

  it('rate limit estourado → transient', async () => {
    readSystemConfig.mockResolvedValue({});
    registerSkill({ ...skill, key: 'rl', rateLimit: { max: 0, windowMs: 1000 } } as never);
    await expect(
      runSkill('rl', {}, { userId: 'u', tenantId: 't' }),
    ).rejects.toMatchObject({ reason: 'transient' });
  });
});
