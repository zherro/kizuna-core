// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PlacesExplorer } from './places-explorer';
import { MapCallout } from './map-callout';

const ROW = (uid: string, address_id: number, title: string, extra: Record<string, unknown> = {}) => ({
  uid,
  address_id,
  title,
  category_slug: 'shows-e-musica-ao-vivo',
  category_group_slug: 'eventos',
  cover_file_id: 'cover-1',
  latitude: -15.601 + address_id * 0.001,
  longitude: -56.097,
  venue: 'Casa Teste',
  city: 'Cuiabá',
  state: 'MT',
  distance_km: 0.2,
  event_start: '2026-11-05T20:30:00',
  ...extra,
});

const DETAIL = {
  uid: 'u1',
  title: 'Show do Fulano',
  description: '<p>Uma noite de <b>música</b>.</p>',
  category: 'Shows e música ao vivo',
  category_slug: 'shows-e-musica-ao-vivo',
  category_group_slug: 'eventos',
  cover_file_id: 'cover-1',
  image_file_ids: ['cover-1', 'img-2'],
  price: 30,
  price_type: 'fixed',
  address: 'Rua X, 100',
  latitude: -15.6,
  longitude: -56.1,
  venue: 'Casa Teste',
  city: 'Cuiabá',
  state: 'MT',
  event_start: '2026-11-05T20:30:00',
  facts: { telefone: '(65) 3000-0000', instagram: '@casateste', horario: [{ texto: 'Sex, 20h' }], dicas: 'Chegue cedo.' },
};

type Handler = (url: string, body: any, signal?: AbortSignal) => Promise<unknown> | unknown;
const calls: { url: string; body: any; signal?: AbortSignal }[] = [];
let handler: Handler;

function stubFetch() {
  calls.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body, signal: init?.signal as AbortSignal | undefined });
      const data = await handler(url, body, init?.signal as AbortSignal | undefined);
      return { ok: true, status: 200, json: async () => data } as Response;
    })
  );
}
const pinCalls = () => calls.filter((c) => c.url.endsWith('fn_map_pins'));
const placeCalls = () => calls.filter((c) => c.url.endsWith('fn_map_place'));

let roCallbacks: (() => void)[] = [];
class RO {
  constructor(cb: () => void) {
    roCallbacks.push(cb);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}
let width = 800;
const getCurrentPosition = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  roCallbacks = [];
  width = 800;
  vi.stubGlobal('ResizeObserver', RO);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => (width ? 600 : 0));
  getCurrentPosition.mockReset();
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  handler = (url) => (url.endsWith('fn_map_pins') ? [ROW('u1', 1, 'Show do Fulano'), ROW('u2', 1, 'Bar do Beltrano')] : [DETAIL]);
  stubFetch();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Passa o debounce e deixa as promessas da busca resolverem. */
const settle = (ms = 450) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

async function setup() {
  render(<PlacesExplorer />);
  await settle();
}

describe('busca por raio', () => {
  it('monta sem buscar até medir o quadro; depois busca uma vez', async () => {
    width = 0;
    render(<PlacesExplorer />);
    await settle(1500);
    expect(pinCalls()).toHaveLength(0);

    width = 800;
    await act(async () => roCallbacks.forEach((cb) => cb()));
    await settle();
    expect(pinCalls()).toHaveLength(1);
  });

  it('busca no centro de Cuiabá com o raio da metade da diagonal e sem filtros', async () => {
    await setup();
    const { url, body } = pinCalls()[0];
    expect(url).toBe('/api/resources/fn_map_pins');
    expect(body.p_lat).toBeCloseTo(-15.601, 2);
    expect(body.p_lng).toBeCloseTo(-56.097, 2);
    // 800x600 no zoom 14 a -15,6° ≈ 4,6 km
    expect(body.p_radius_km).toBeGreaterThan(4);
    expect(body.p_radius_km).toBeLessThan(5.2);
    expect(body).toMatchObject({ p_limit: 200, p_group_slugs: null, p_category_slugs: null });
  });

  it('desenha um pino por uid:address_id e deduplica repetidos', async () => {
    handler = (url) =>
      url.endsWith('fn_map_pins')
        ? [ROW('u1', 1, 'Show'), ROW('u1', 1, 'Show'), ROW('u1', 2, 'Show (outro endereço)'), ROW('u2', 1, 'Bar')]
        : [];
    await setup();
    expect(document.querySelectorAll('[data-place-id]')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Bar' })).toBeTruthy();
  });

  it('afastar o mapa (raio maior) busca de novo, cancela a anterior e mescla sem duplicar', async () => {
    let release: (v: unknown) => void = () => {};
    let n = 0;
    handler = (url) => {
      if (!url.endsWith('fn_map_pins')) return [];
      n += 1;
      if (n === 1) return [ROW('u1', 1, 'Show')];
      if (n === 2) return new Promise((r) => (release = r)); // segunda fica pendente
      return [ROW('u1', 1, 'Show'), ROW('u3', 1, 'Novo')];
    };
    await setup();
    expect(pinCalls()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Afastar' }));
    await settle();
    expect(pinCalls()).toHaveLength(2);
    expect(pinCalls()[1].body.p_radius_km).toBeGreaterThan(pinCalls()[0].body.p_radius_km);
    expect(screen.getByText('Buscando lugares…')).toBeTruthy();

    // Mexe de novo enquanto a segunda está pendente: a terceira cancela a segunda.
    fireEvent.click(screen.getByRole('button', { name: 'Afastar' }));
    await settle();
    expect(pinCalls()).toHaveLength(3);
    expect(pinCalls()[1].signal!.aborted).toBe(true);
    expect(pinCalls()[2].signal!.aborted).toBe(false);
    await act(async () => release([ROW('u9', 1, 'Fantasma')])); // resposta da cancelada é ignorada
    expect(screen.queryByRole('button', { name: 'Fantasma' })).toBeNull();
    expect(document.querySelectorAll('[data-place-id]')).toHaveLength(2); // u1 (1x) + u3
  });

  it('mexer pouco (centro dentro de 30% do raio) não busca de novo', async () => {
    await setup();
    const map = screen.getByRole('region', { name: 'Mapa de lugares' });
    fireEvent.pointerDown(map, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(map, { pointerId: 1, clientX: 380, clientY: 300 });
    fireEvent.pointerUp(map, { pointerId: 1 });
    await settle();
    expect(pinCalls()).toHaveLength(1);
  });

  it('erro na busca mostra aviso discreto e o mapa continua usável', async () => {
    handler = (url) => {
      if (url.endsWith('fn_map_pins')) throw new Error('boom');
      return [];
    };
    // fetch devolve ok:true com data lançando? simula status de erro:
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response));
    await setup();
    expect(screen.getByText(/Não deu para carregar os lugares agora/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Perto de mim' })).toBeTruthy();
  });

  it('sem pinos no raio: aviso discreto depois de carregar', async () => {
    handler = () => [];
    await setup();
    expect(screen.getByText('Ainda estamos marcando os lugares no mapa.')).toBeTruthy();
  });
});

describe('seleção, barra e painel', () => {
  it('pino é botão acessível; tocar mostra barra com capa, Calcular rota e Ver mais', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    const bar = screen.getByRole('region', { name: /Lugar selecionado: Show do Fulano/ });
    expect(within(bar).getByRole('button', { name: /Calcular rota/ })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: /Ver mais/ })).toBeTruthy();
    expect(within(bar).getByText('Casa Teste · Cuiabá')).toBeTruthy();
    expect(bar.querySelector('img')?.getAttribute('src')).toContain('/api/public/storage/files/cover-1/content');
    expect(placeCalls()).toHaveLength(0); // nada de detalhe antes do "Ver mais"
  });

  it('Ver mais abre o painel (70% no desktop, 100% no celular), busca o detalhe e mostra os dados', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('md:w-[70%]');
    expect(dialog.className).toContain('w-full');
    expect(dialog.className).not.toContain('max-w-md');
    expect(within(dialog).getByRole('status', { name: 'Carregando detalhes' })).toBeTruthy();
    await settle(10);
    expect(placeCalls()).toHaveLength(1);
    expect(placeCalls()[0].body).toEqual({ p_uid: 'u1' });
    expect(within(dialog).getByText('Uma noite de música.')).toBeTruthy();
    expect(within(dialog).getByText('05/11/2026 às 20h30')).toBeTruthy();
    expect(within(dialog).getByText('Chegue cedo.')).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Abrir página completa' }).getAttribute('href')).toBe('/cuiaba-mt/anuncio/u1');
  });

  it('fechar e abrir de novo o mesmo anúncio não chama a RPC outra vez', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    await settle(10);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: /Lugar selecionado/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    await settle(10);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(placeCalls()).toHaveLength(1);
  });

  it('resposta vazia: "Este lugar não está mais disponível", sem quebrar', async () => {
    handler = (url) => (url.endsWith('fn_map_pins') ? [ROW('u1', 1, 'Show do Fulano')] : []);
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    await settle(10);
    expect(within(screen.getByRole('dialog')).getByText('Este lugar não está mais disponível.')).toBeTruthy();
  });

  it('erro no detalhe oferece "Tentar de novo"', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined, signal: init?.signal as AbortSignal });
        if (url.endsWith('fn_map_place') && fail) return { ok: false, status: 500, json: async () => ({}) } as Response;
        return { ok: true, status: 200, json: async () => (url.endsWith('fn_map_pins') ? [ROW('u1', 1, 'Show do Fulano')] : [DETAIL]) } as Response;
      })
    );
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    await settle(10);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await settle(10);
    expect(screen.getByText('Uma noite de música.')).toBeTruthy();
  });

  it('o foco entra no painel e Tab não sai dele', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }));
    await settle(10);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    within(dialog).getByRole('button', { name: 'Fechar' }).focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('X da barra e clique no fundo limpam a seleção; trocar de pino troca a barra', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('region', { name: /Lugar selecionado/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Bar do Beltrano' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show do Fulano' }));
    expect(screen.getByRole('region', { name: /Lugar selecionado: Show do Fulano/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('region', { name: 'Mapa de lugares' }));
    expect(screen.queryByRole('region', { name: /Lugar selecionado/ })).toBeNull();
  });
});

describe('Perto de mim', () => {
  it('não pede a posição ao montar; pede só no clique e mostra o ponto do usuário', async () => {
    await setup();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    getCurrentPosition.mockImplementation((ok: (p: unknown) => void) =>
      ok({ coords: { latitude: -15.62, longitude: -56.1, accuracy: 20 } })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Perto de mim' }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Você está aqui' })).toBeTruthy();
    // centrou no usuário: a próxima busca é em torno dele
    await settle();
    expect(pinCalls().at(-1)!.body.p_lat).toBeCloseTo(-15.62, 2);
  });

  it('localização negada mostra aviso e o mapa segue funcionando', async () => {
    await setup();
    getCurrentPosition.mockImplementation((_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Perto de mim' }));
    expect(screen.getByText(/Sem acesso à sua localização/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show do Fulano' })).toBeTruthy();
  });
});

describe('MapCallout', () => {
  it('é um link para o mapa', () => {
    render(<MapCallout href="/mapa" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/mapa');
    expect(link.textContent).toContain('O que tem perto de você');
  });
});
