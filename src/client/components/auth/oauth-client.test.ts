// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOAuthLogin } from './oauth-client';

let assign: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  open = vi.spyOn(window, 'open');
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, pathname: '/eventos', search: '?x=1', origin: 'http://localhost', assign },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startOAuthLogin', () => {
  it('vai ao provedor na própria aba (sem popup), voltando para a página atual', () => {
    startOAuthLogin('google');
    expect(open).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(
      '/api/auth/oauth/google/start?returnTo=%2Feventos%3Fx%3D1'
    );
  });

  it('returnTo explícito vence; endereço de fora vira /painel', () => {
    startOAuthLogin('google', '/painel');
    expect(assign).toHaveBeenLastCalledWith('/api/auth/oauth/google/start?returnTo=%2Fpainel');
    startOAuthLogin('google', 'https://mal.com');
    expect(assign).toHaveBeenLastCalledWith('/api/auth/oauth/google/start?returnTo=%2Fpainel');
  });
});
