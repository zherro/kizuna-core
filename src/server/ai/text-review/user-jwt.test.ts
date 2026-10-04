import { beforeEach, describe, expect, it, vi } from 'vitest';

const pgrstTable = vi.fn();
const pgrstRpc = vi.fn();
vi.mock('../../postrest/conn', () => ({
  pgrstTable: (...a: unknown[]) => pgrstTable(...a),
  pgrstRpc: (...a: unknown[]) => pgrstRpc(...a),
}));

import { aiRpc, aiTable } from '../db';
import { buildServiceContext } from './context';
import { clearReviewPromptCache, defaultReviewPrompt, loadReviewPrompt } from './prompt-store';
import { textReviewSkill } from './skill';

const db = { accessToken: 'jwt-do-root' };
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });

beforeEach(() => {
  pgrstTable.mockReset();
  pgrstRpc.mockReset();
  clearReviewPromptCache();
});

describe('acesso com o JWT do usuário (sem token de serviço)', () => {
  it('aiTable e aiRpc mandam Authorization com o JWT do usuário', async () => {
    pgrstTable.mockResolvedValue(json([]));
    pgrstRpc.mockResolvedValue(json(null));
    await aiTable(db, '/categories?id=eq.1');
    await aiRpc(db, 'fn_ai_credential_get_cipher', { p_provider: 'claude' });
    expect(pgrstTable).toHaveBeenCalledWith('/categories?id=eq.1', undefined, { auth: 'Bearer jwt-do-root' });
    expect(pgrstRpc).toHaveBeenCalledWith('fn_ai_credential_get_cipher', { p_provider: 'claude' }, {
      auth: 'Bearer jwt-do-root',
    });
  });

  it('buildServiceContext lê tudo com o JWT do usuário', async () => {
    pgrstTable.mockImplementation(async (path: string) => {
      if (path.startsWith('/services?')) {
        return json([{ id: 5, tenant_id: 't', title: 'T', description: 'D', category_id: 2, category: { name: 'C' }, group: { name: 'G' } }]);
      }
      return json([]);
    });
    const ctx = await buildServiceContext(db, 5);
    expect(ctx).toMatchObject({ serviceId: 5, category: 'C', group: 'G', categoryId: 2 });
    expect(pgrstTable.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const call of pgrstTable.mock.calls) expect(call[2]).toEqual({ auth: 'Bearer jwt-do-root' });
  });

  it('loadReviewPrompt sem db usa o prompt embutido e não consulta o banco', async () => {
    const p = await loadReviewPrompt(null, 3);
    expect(p).toEqual(defaultReviewPrompt());
    expect(pgrstTable).not.toHaveBeenCalled();
  });

  it('loadReviewPrompt com db lê ai_prompts com o JWT', async () => {
    pgrstTable.mockResolvedValue(
      json([{ system_prompt: 'S', user_template: 'U', version: 4, category_id: null, temperature: '0.5' }])
    );
    const p = await loadReviewPrompt(db, null);
    expect(p).toMatchObject({ systemPrompt: 'S', userTemplate: 'U', version: 4, temperature: 0.5, source: 'db' });
    expect(pgrstTable.mock.calls[0][2]).toEqual({ auth: 'Bearer jwt-do-root' });
  });

  it('a skill sem contexto pré-carregado e sem db recusa (blocked) em vez de usar acesso de serviço', async () => {
    await expect(
      textReviewSkill.loadContext!({ serviceId: 1 }, { userId: 'u', tenantId: 't' })
    ).rejects.toMatchObject({ name: 'AiUnavailableError', reason: 'blocked' });
    expect(pgrstTable).not.toHaveBeenCalled();
  });
});
