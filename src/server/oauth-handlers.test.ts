import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const exchange = vi.fn();
const verifyIdToken = vi.fn();
vi.mock('./oauth/providers', () => ({
  getOAuthProvider: (id: string) =>
    id === 'google'
      ? {
          id: 'google',
          label: 'Google',
          isEnabled: () => true,
          authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth?x=1',
          exchange,
          oneTapClientId: () => 'client-123',
          verifyIdToken,
        }
      : null,
  listEnabledOAuthProviders: () => [],
}));
vi.mock('./account/report-recreation', () => ({ safeReportAccountRecreation: vi.fn() }));

const { createOAuthCallbackHandler, createOAuthOneTapHandlers, createOAuthStartHandler } =
  await import('./oauth-handlers');

const SECRET = 'test-secret';
const ctx = { params: Promise.resolve({ provider: 'google' }) };
const profile = {
  subject: 'sub-1',
  email: 'a@b.com',
  emailVerified: true,
  name: 'Ana',
  picture: null,
};
const okRpc = vi.fn(
  async () => new Response(JSON.stringify({ user_uid: 'u1', tenant_uid: 't1' }), { status: 200 })
);

function flowCookie(extra: Record<string, unknown> = {}) {
  const flow = { p: 'google', s: 'st', v: 'ver', n: 'non', r: '/descobrir', ...extra };
  return `kizuna_oauth=${jwt.sign(flow, SECRET, { algorithm: 'HS256' })}`;
}

function callback(query: string, cookie: string) {
  return new Request(`http://localhost:3000/api/auth/oauth/google/callback?${query}`, {
    headers: { cookie },
  });
}

beforeEach(() => {
  vi.stubEnv('PGRST_JWT_SECRET', SECRET);
  vi.stubEnv('APP_URL', 'http://localhost:3000');
  exchange.mockReset().mockResolvedValue(profile);
  verifyIdToken.mockReset().mockResolvedValue(profile);
});
afterEach(() => vi.unstubAllEnvs());

describe('start', () => {
  it('popup=1 grava o modo popup no flow', async () => {
    const res = await createOAuthStartHandler()(
      new Request('http://localhost:3000/api/auth/oauth/google/start?returnTo=/x&popup=1'),
      ctx
    );
    expect(res.status).toBe(302);
    const cookie = res.headers.get('set-cookie') ?? '';
    const token = /kizuna_oauth=([^;]+)/.exec(cookie)?.[1] ?? '';
    expect(jwt.verify(decodeURIComponent(token), SECRET)).toMatchObject({ m: 'popup', r: '/x' });
  });
});

describe('callback em popup', () => {
  it('sucesso: página que avisa a aba de origem + cookie de sessão', async () => {
    const res = await createOAuthCallbackHandler(okRpc)(
      callback('state=st&code=c', flowCookie({ m: 'popup' })),
      ctx
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('"type":"kizuna:oauth","ok":true');
    expect(html).toContain('"/descobrir"');
    expect(res.headers.get('set-cookie')).toMatch(/session=/);
    // O script inline precisa ser JS válido.
    const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? '';
    expect(() => new Function(script)).not.toThrow();
  });

  /** Roda o script da página com navegador falso: `ack` = a aba de origem respondeu. */
  async function runPopupScript(ack: boolean) {
    const res = await createOAuthCallbackHandler(okRpc)(
      callback('state=st&code=c', flowCookie({ m: 'popup' })),
      ctx
    );
    const script = /<script>([\s\S]*)<\/script>/.exec(await res.text())?.[1] ?? '';
    const replace = vi.fn();
    const close = vi.fn(); // o Chrome recusa: a janela continua aberta
    type Node = { textContent: string; href?: string; style: { display: string }; onclick?: () => void };
    const nodes: Record<string, Node> = {
      'k-msg': { textContent: 'Entrando…', style: { display: '' } },
      'k-actions': { textContent: '', style: { display: 'none' } },
      'k-close': { textContent: '', style: { display: '' } },
      'k-go': { textContent: '', href: '/', style: { display: '' } },
    };
    class FakeChannel {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      postMessage() {
        if (ack) queueMicrotask(() => this.onmessage?.({ data: { type: 'kizuna:oauth:ack' } }));
      }
      close() {}
    }
    const timers: Array<() => void> = [];
    new Function('BroadcastChannel', 'window', 'location', 'document', 'setTimeout', script)(
      FakeChannel,
      { opener: null, close },
      { origin: 'http://localhost:3000', replace },
      { getElementById: (id: string) => nodes[id] },
      (fn: () => void) => timers.push(fn)
    );
    await Promise.resolve();
    timers.forEach((fn) => fn());
    return { replace, close, nodes };
  }

  it('aba de origem confirmou (ack) e a janela não fechou: diz que pode fechar, sem abrir o site aqui dentro', async () => {
    const { replace, close, nodes } = await runPopupScript(true);
    expect(close).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(nodes['k-msg'].textContent).toBe('Pronto, você entrou. Pode fechar esta janela.');
    expect(nodes['k-actions'].style.display).toBe('flex');
    expect(nodes['k-go'].style.display).toBe('none');
  });

  it('ninguém confirmou (aviso não chegou ou sem aba de origem): não abre o site sozinha, oferece "Continuar no site"', async () => {
    const { replace, nodes } = await runPopupScript(false);
    expect(replace).not.toHaveBeenCalled();
    expect(nodes['k-msg'].textContent).toBe('Pronto, você entrou. Pode fechar esta janela.');
    expect(nodes['k-go'].style.display).toBe('');
    expect(nodes['k-go'].href).toBe('/descobrir');
  });

  it('cancelado: avisa erro e o fallback é a própria página', async () => {
    const res = await createOAuthCallbackHandler(okRpc)(
      callback('state=st&error=access_denied', flowCookie({ m: 'popup' })),
      ctx
    );
    const html = await res.text();
    expect(html).toContain('"ok":false,"error":"cancelado"');
    expect(html).toContain('go.href = "/descobrir"');
  });

  it('sem popup continua sendo redirect', async () => {
    const res = await createOAuthCallbackHandler(okRpc)(
      callback('state=st&code=c', flowCookie()),
      ctx
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/descobrir');
  });
});

describe('One Tap', () => {
  const handlers = () => createOAuthOneTapHandlers(okRpc);

  it('GET entrega clientId + nonce e grava o cookie', async () => {
    const res = await handlers().GET(new Request('http://localhost:3000/x'), ctx);
    const body = await res.json();
    expect(body).toMatchObject({ enabled: true, clientId: 'client-123' });
    expect(res.headers.get('set-cookie')).toMatch(/kizuna_onetap=/);
  });

  it('POST sem o cookie do GET → sessao_expirada', async () => {
    const res = await handlers().POST(
      new Request('http://localhost:3000/x', {
        method: 'POST',
        body: JSON.stringify({ credential: 'tok' }),
      }),
      ctx
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'sessao_expirada' });
  });

  it('POST válido abre a sessão, validando com o nonce do cookie', async () => {
    const cookie = `kizuna_onetap=${jwt.sign({ p: 'google', n: 'nn' }, SECRET)}`;
    const res = await handlers().POST(
      new Request('http://localhost:3000/x', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ credential: 'tok' }),
      }),
      ctx
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(verifyIdToken).toHaveBeenCalledWith('tok', { nonce: 'nn' });
    expect(res.headers.get('set-cookie')).toMatch(/session=/);
  });

  it('token inválido → falha_provedor', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('google_invalid_signature'));
    const cookie = `kizuna_onetap=${jwt.sign({ p: 'google', n: 'nn' }, SECRET)}`;
    const res = await handlers().POST(
      new Request('http://localhost:3000/x', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ credential: 'tok' }),
      }),
      ctx
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: 'falha_provedor' });
  });
});
