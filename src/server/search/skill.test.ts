import { describe, expect, it, vi } from 'vitest';

vi.mock('./taxonomy', () => ({
  loadTaxonomySnapshot: async () => ({ groups: [], categories: [], loadedAt: 0 }),
  formatTaxonomyForPrompt: () => 'TAXONOMIA_MOCK',
  validateAgentFilter: (raw: Record<string, unknown>) => ({ ...raw, categoryId: null }),
}));

import { searchSkill } from './skill';

const ctx = { userId: 'u', tenantId: 't' };
const input = {
  messages: [],
  location: { state: 'PR', cityId: null, cityName: null },
  filtrosAtuais: {},
};

describe('searchSkill', () => {
  it('key/context corretos', () => {
    expect(searchSkill.key).toBe('search');
    expect(searchSkill.context).toBe('search');
  });

  it('buildPrompt injeta a taxonomia', async () => {
    const loaded = await searchSkill.loadContext!(input as never, ctx);
    const { systemPrompt, contents } = searchSkill.buildPrompt(input as never, loaded);
    expect(systemPrompt).toBeTruthy();
    expect(JSON.stringify(contents)).toContain('TAXONOMIA_MOCK');
  });

  it('validate reproduz o SearchChatResponse e limpa o filtro via validateAgentFilter', async () => {
    const loaded = await searchSkill.loadContext!(input as never, ctx);
    const out = searchSkill.validate(
      {
        mensagem_usuario: ' oi ',
        resumo: 'r',
        precisa_mais_info: true,
        filtro: { categoryId: 999 },
      },
      loaded,
      input as never
    );
    expect(out).toEqual({
      mensagem_usuario: 'oi',
      resumo: 'r',
      precisa_mais_info: true,
      filtro: { categoryId: null },
    });
  });

  it('validate cai no default quando mensagem_usuario vem vazia e filtro ausente', async () => {
    const loaded = await searchSkill.loadContext!(input as never, ctx);
    const out = searchSkill.validate({}, loaded, input as never);
    expect(out).toEqual({
      mensagem_usuario: 'Certo!',
      resumo: '',
      precisa_mais_info: false,
      filtro: null,
    });
  });
});
