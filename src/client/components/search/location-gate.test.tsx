// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LocationGate } from './location-gate';

vi.mock('../location-modal', () => ({
  LocationModal: () => <div data-testid="location-modal" />,
}));

const CUIABA = { stateCode: 'MT', stateName: 'Mato Grosso', cityId: 5103403, cityName: 'Cuiabá' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** IP sempre indisponível (dev / ip-api fora); o `resolve` devolve `resolved`. */
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

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LocationGate', () => {
  it('IP indisponível + cidade padrão configurada → entra na busca com a cidade padrão', async () => {
    const fetchMock = stubIpDown(CUIABA);
    render(
      <LocationGate>
        <p>resultados</p>
      </LocationGate>
    );

    expect(await screen.findByText('resultados')).toBeTruthy();
    expect(screen.queryByTestId('location-modal')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user_location') ?? '{}')).toMatchObject({
      cityId: 5103403,
      source: 'ip',
    });
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/location/resolve'))).toBe(
      true
    );
  });

  it('IP indisponível e sem cidade padrão (resolve → null) → abre o seletor', async () => {
    stubIpDown(null);
    render(
      <LocationGate>
        <p>resultados</p>
      </LocationGate>
    );

    expect(await screen.findByTestId('location-modal')).toBeTruthy();
    expect(screen.queryByText('resultados')).toBeNull();
  });
});
