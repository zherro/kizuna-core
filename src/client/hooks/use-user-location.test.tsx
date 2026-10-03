// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { __resetLocationInit, useUserLocation } from './use-user-location';

const CUIABA = { stateCode: 'MT', stateName: 'Mato Grosso', cityId: 5103403, cityName: 'Cuiabá' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** IP indisponível; o `resolve` devolve `resolved`. */
function stubIpDown(resolved: unknown) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/location/ip')) return json({ message: 'IP nao identificavel' }, 404);
    if (url.startsWith('/api/location/resolve')) return json({ location: resolved });
    return json({}, 404);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Qualquer tela que só lê o local (ex.: o botão do header na home) — sem LocationGate. */
function Probe() {
  const { location, ready } = useUserLocation();
  return <p>{ready ? (location?.cityName ?? 'sem local') : 'carregando'}</p>;
}

beforeEach(() => {
  localStorage.clear();
  __resetLocationInit();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useUserLocation — inicialização (igual em toda tela)', () => {
  it('sem local salvo e IP indisponível → aplica a cidade padrão', async () => {
    stubIpDown(CUIABA);
    render(<Probe />);
    expect(await screen.findByText('Cuiabá')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('user_location') ?? '{}')).toMatchObject({
      cityId: 5103403,
      source: 'ip',
    });
  });

  it('rede instável: o resolve falha e tenta de novo até aplicar a cidade padrão', async () => {
    let resolveCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/location/ip')) throw new TypeError('Failed to fetch');
        if (url.startsWith('/api/location/resolve')) {
          resolveCalls += 1;
          if (resolveCalls === 1) throw new TypeError('Failed to fetch');
          if (resolveCalls === 2) return json({ message: 'erro' }, 502);
          return json({ location: CUIABA });
        }
        return json({}, 404);
      })
    );
    render(<Probe />);
    expect(await screen.findByText('Cuiabá', {}, { timeout: 5000 })).toBeTruthy();
    expect(resolveCalls).toBe(3);
  });

  it('sem cidade padrão (resolve → null) → pronto, sem local', async () => {
    stubIpDown(null);
    render(<Probe />);
    expect(await screen.findByText('sem local')).toBeTruthy();
  });

  it('várias instâncias do hook detectam uma vez só', async () => {
    const fetchMock = stubIpDown(CUIABA);
    render(
      <>
        <Probe />
        <Probe />
      </>
    );
    expect(await screen.findAllByText('Cuiabá')).toHaveLength(2);
    const resolves = fetchMock.mock.calls.filter(([u]) =>
      String(u).startsWith('/api/location/resolve')
    );
    expect(resolves).toHaveLength(1);
  });
});
