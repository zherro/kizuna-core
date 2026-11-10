// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOAuthLogin } from './oauth-client';

type FakePopup = { closed: boolean };

let popup: FakePopup;
let assign: ReturnType<typeof vi.fn>;
let me: { user: unknown };

beforeEach(() => {
  vi.useFakeTimers();
  popup = { closed: false };
  me = { user: null };
  vi.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, pathname: '/', search: '', origin: 'http://localhost', assign, reload: vi.fn() },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => me }))
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe('startOAuthLogin — popup', () => {
  it('aviso da janela pelo BroadcastChannel: responde ack e segue para o destino', async () => {
    const popupSide = new BroadcastChannel('kizuna:oauth');
    const acks: unknown[] = [];
    popupSide.onmessage = (e) => acks.push(e.data);

    startOAuthLogin('google', '/painel');
    popupSide.postMessage({ type: 'kizuna:oauth', ok: true });
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/painel'), { timeout: 1000 });
    await vi.waitFor(() => expect(acks).toContainEqual({ type: 'kizuna:oauth:ack' }), { timeout: 1000 });
    popupSide.close();
  });

  it('nenhum aviso chega (janela isolada), mas a janela fechou e a sessão existe: segue para o destino', async () => {
    startOAuthLogin('google', '/painel');
    me = { user: { id: 'u1' } };
    popup.closed = true;
    vi.advanceTimersByTime(600);
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.anything());
    expect(assign).toHaveBeenCalledWith('/painel');
  });

  it('volta o foco para a aba com a sessão ativa: segue para o destino', async () => {
    startOAuthLogin('google', '/painel');
    me = { user: { id: 'u1' } };
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(assign).toHaveBeenCalledWith('/painel');
  });

  it('janela fechada sem login: continua onde estava', async () => {
    startOAuthLogin('google', '/painel');
    popup.closed = true;
    vi.advanceTimersByTime(600);
    await flush();
    expect(assign).not.toHaveBeenCalled();
  });
});
