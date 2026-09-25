import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runSkill, registerSkill, checkRateLimit, AiUnavailableError } = vi.hoisted(() => {
  class AiUnavailableError extends Error {
    reason = 'disabled';
    constructor(message = 'off') {
      super(message);
      this.name = 'AiUnavailableError';
    }
  }
  return {
    runSkill: vi.fn(),
    registerSkill: vi.fn(),
    checkRateLimit: vi.fn(),
    AiUnavailableError,
  };
});

vi.mock('../ai', () => ({
  AiUnavailableError,
  registerSkill: (...a: unknown[]) => registerSkill(...a),
  runSkill: (...a: unknown[]) => runSkill(...a),
}));
vi.mock('../ai/rate-limit', () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));
vi.mock('./skill', () => ({ searchSkill: { key: 'search' } }));

import { handleSearchChat } from './chat-handler';

const post = (body: unknown) =>
  new Request('http://x/api/ai/search-chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });

const valid = {
  messages: [{ role: 'user', content: 'preciso de um eletricista' }],
  location: { state: 'PR', cityId: 4106902, cityName: 'Curitiba' },
  filtrosAtuais: {},
};

describe('handleSearchChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue(true);
  });

  it('registra a skill e devolve o filtro da IA', async () => {
    runSkill.mockResolvedValue({ output: { mensagem_usuario: 'ok', filtro: null } });
    const res = await handleSearchChat(post(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mensagem_usuario: 'ok', filtro: null });
    expect(registerSkill).toHaveBeenCalledWith({ key: 'search' });
    expect(runSkill).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({ location: { state: 'PR', cityId: 4106902, cityName: 'Curitiba' } }),
      { userId: 'anon', tenantId: '' }
    );
  });

  it('400 sem mensagens ou sem estado', async () => {
    expect((await handleSearchChat(post({ ...valid, messages: [] }))).status).toBe(400);
    expect(
      (await handleSearchChat(post({ ...valid, location: { state: ' ' } }))).status
    ).toBe(400);
    expect(
      (await handleSearchChat(post({ ...valid, messages: [{ role: 'system', content: 'x' }] })))
        .status
    ).toBe(400);
    expect(runSkill).not.toHaveBeenCalled();
  });

  it('429 quando estoura o rate limit por IP', async () => {
    checkRateLimit.mockReturnValue(false);
    const res = await handleSearchChat(post(valid));
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith('search-chat:1.2.3.4', 20, 5 * 60 * 1000);
  });

  it('503 com fallback de texto quando a IA está indisponível', async () => {
    runSkill.mockRejectedValue(new AiUnavailableError());
    const res = await handleSearchChat(post(valid));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ fallback: 'text', reason: 'disabled' });
  });

  it('500 em erro inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    runSkill.mockRejectedValue(new Error('boom'));
    const res = await handleSearchChat(post(valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: 'boom' });
  });
});
