import { describe, expect, it, vi } from 'vitest';

const pgrstTable = vi.fn();
vi.mock('../postrest/conn', () => ({ pgrstTable: (...a: unknown[]) => pgrstTable(...a) }));

import { readSystemConfig } from './system-config';

describe('readSystemConfig', () => {
  it('devolve o valor desembrulhado', async () => {
    pgrstTable.mockResolvedValue({ ok: true, json: async () => [{ value: 'gemini' }] });
    expect(await readSystemConfig('ai_assistant.provider')).toBe('gemini');
  });

  it('null quando não existe', async () => {
    pgrstTable.mockResolvedValue({ ok: true, json: async () => [] });
    expect(await readSystemConfig('ausente')).toBeNull();
  });

  it('null quando a resposta não é ok', async () => {
    pgrstTable.mockResolvedValue({ ok: false, json: async () => [{ value: 'x' }] });
    expect(await readSystemConfig('ai_assistant.provider')).toBeNull();
  });
});
