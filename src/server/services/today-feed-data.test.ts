import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: <F>(fn: F) => fn }));
vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T>(b: T) => b }));

import { addDays, eventDay, inWindow, loadTodayFeed, localDayKey, startsOnDay } from './today-feed-data';

// 28/10/2026 10:00 em Cuiabá (UTC-4)
const NOW = new Date('2026-10-28T14:00:00Z');

const item = (uid: string, eventStart: string | null = null) => ({ uid, title: uid, event_start: eventStart });
const rpcReturns = (items: unknown[]) =>
  pgrstRpc.mockResolvedValueOnce(new Response(JSON.stringify(items), { status: 200 }));

const taxonomy = (slug: string, id: number) => [{ id, name: slug, slug }];

beforeEach(() => {
  serverFetchResource.mockReset();
  pgrstRpc.mockReset();
});

describe('localDayKey', () => {
  it('usa o dia de Cuiabá, não o UTC', () => {
    expect(localDayKey(new Date('2026-10-29T02:00:00Z'))).toBe('2026-10-28');
    expect(localDayKey(new Date('2026-10-28T04:30:00Z'))).toBe('2026-10-28');
    expect(localDayKey(new Date('2026-10-28T03:59:00Z'))).toBe('2026-10-27');
  });
});

describe('startsOnDay', () => {
  it('compara só a data local do início', () => {
    expect(startsOnDay('2026-10-28T20:00', '2026-10-28')).toBe(true);
    expect(startsOnDay('2026-10-28', '2026-10-28')).toBe(true);
    expect(startsOnDay('2026-10-29T00:00', '2026-10-28')).toBe(false);
    expect(startsOnDay(null, '2026-10-28')).toBe(false);
    expect(startsOnDay('lixo', '2026-10-28')).toBe(false);
  });
});

describe('loadTodayFeed', () => {
  it('em seção onlyToday mantém só o que começa hoje, pela ordem de início', async () => {
    serverFetchResource.mockResolvedValueOnce(taxonomy('eventos', 3));
    rpcReturns([
      item('amanha', '2026-10-29T19:00'),
      item('noite', '2026-10-28T21:00'),
      item('cedo', '2026-10-28T09:00'),
      item('sem-data'),
    ]);

    const feed = await loadTodayFeed([{ group: 'eventos', onlyToday: true }], { now: NOW });

    expect(feed).toHaveLength(1);
    expect(feed[0].items.map((i) => i.uid)).toEqual(['cedo', 'noite']);
    const body = pgrstRpc.mock.calls[0][1];
    expect(body.p_group_category_slug).toBe('eventos');
    expect(body.p_order).toBe('event_start');
  });

  it('mantém a ordem da configuração e some com seção sem item', async () => {
    serverFetchResource
      .mockResolvedValueOnce(taxonomy('eventos', 3))
      .mockResolvedValueOnce(taxonomy('cinema', 4))
      .mockResolvedValueOnce(taxonomy('bares', 5));
    rpcReturns([]); // eventos: nada hoje
    rpcReturns([item('filme-1'), item('filme-2')]);
    rpcReturns([item('bar-1')]);

    const feed = await loadTodayFeed(
      [
        { group: 'eventos', onlyToday: true, title: 'Eventos de hoje' },
        { slug: 'cinema', title: 'Cinema em cartaz' },
        { slug: 'bares', title: 'Bares' },
      ],
      { now: NOW }
    );

    expect(feed.map((s) => s.title)).toEqual(['Cinema em cartaz', 'Bares']);
    expect(feed[0].category.slug).toBe('cinema');
  });

  it('respeita o limite e informa hasMore', async () => {
    serverFetchResource.mockResolvedValueOnce(taxonomy('bares', 5));
    rpcReturns([item('a'), item('b'), item('c')]);

    const [bares] = await loadTodayFeed([{ slug: 'bares', limit: 2 }], { now: NOW });

    expect(bares.items.map((i) => i.uid)).toEqual(['a', 'b']);
    expect(bares.hasMore).toBe(true);
  });

  it('passa a cidade e as irmãs da região e usa semente fixa no dia', async () => {
    serverFetchResource.mockResolvedValue(taxonomy('bares', 5));
    rpcReturns([item('a')]);
    rpcReturns([item('a')]);

    await loadTodayFeed([{ slug: 'bares', scope: 'region' }], {
      now: NOW,
      cityIbge: '5103403',
      cityIbges: ['5103403', '5108402'],
    });
    await loadTodayFeed([{ slug: 'bares' }], { now: new Date('2026-10-28T20:00:00Z'), cityIbge: '5103403' });

    const first = pgrstRpc.mock.calls[0][1];
    expect(first.p_city_ibge).toBe('5103403');
    expect(first.p_city_ibges).toEqual(['5103403', '5108402']);
    // scope city: lista explícita só com a cidade, para a busca não juntar as irmãs
    expect(pgrstRpc.mock.calls[1][1].p_city_ibges).toEqual(['5103403']);
    expect(pgrstRpc.mock.calls[1][1].p_seed).toBe(first.p_seed);
  });

  it('descarta a seção cuja categoria não existe e não derruba as outras', async () => {
    serverFetchResource.mockResolvedValueOnce([]).mockResolvedValueOnce(taxonomy('parques', 6));
    rpcReturns([item('mae-bonifacia')]);

    const feed = await loadTodayFeed([{ slug: 'nao-existe' }, { slug: 'parques' }], { now: NOW });

    expect(feed.map((s) => s.category.slug)).toEqual(['parques']);
  });

  it('falha de rede numa seção não derruba a página', async () => {
    serverFetchResource.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(taxonomy('cinema', 4));
    rpcReturns([item('filme')]);

    const feed = await loadTodayFeed([{ slug: 'bares' }, { slug: 'cinema' }], { now: NOW });

    expect(feed.map((s) => s.category.slug)).toEqual(['cinema']);
  });

  it('nearby busca só as irmãs, week pega hoje e os próximos 6 dias', async () => {
    serverFetchResource.mockResolvedValueOnce(taxonomy('eventos', 3));
    rpcReturns([
      item('hoje', '2026-10-28T20:00'),
      item('sabado', '2026-10-31T19:00'),
      item('quarta-que-vem', '2026-11-04T19:00'),
    ]);

    const [perto] = await loadTodayFeed([{ group: 'eventos', when: 'week', scope: 'nearby' }], {
      now: NOW,
      cityIbge: '5103403',
      cityIbges: ['5103403', '5108402', '5103007'],
    });

    expect(perto.items.map((i) => i.uid)).toEqual(['hoje', 'sabado']);
    expect(perto.when).toBe('week');
    const body = pgrstRpc.mock.calls[0][1];
    expect(body.p_city_ibge).toBe('5108402');
    expect(body.p_city_ibges).toEqual(['5108402', '5103007']);
  });

  it('nearby sem cidade irmã não busca nem aparece', async () => {
    const feed = await loadTodayFeed([{ group: 'eventos', when: 'week', scope: 'nearby' }], {
      now: NOW,
      cityIbge: '5103403',
      cityIbges: ['5103403'],
    });
    expect(feed).toEqual([]);
    expect(pgrstRpc).not.toHaveBeenCalled();
  });

  it('upcoming começa amanhã; seção com emptyText aparece vazia', async () => {
    serverFetchResource.mockResolvedValue(taxonomy('eventos', 3));
    rpcReturns([item('hoje', '2026-10-28T20:00'), item('amanha', '2026-10-29T19:00')]);
    rpcReturns([item('amanha', '2026-10-29T19:00')]);

    const feed = await loadTodayFeed(
      [
        { group: 'eventos', when: 'upcoming', title: 'O que vem por aí' },
        { group: 'eventos', when: 'today', title: 'Acontece hoje', emptyText: 'Nada hoje.' },
      ],
      { now: NOW, cityIbge: '5103403' }
    );

    expect(feed[0].items.map((i) => i.uid)).toEqual(['amanha']);
    expect(feed[1].items).toEqual([]);
    expect(feed[1].emptyText).toBe('Nada hoje.');
  });
});

describe('janela de datas', () => {
  it('eventDay cai no dia do expires_at (Cuiabá) quando não há event_start', () => {
    expect(eventDay({ event_start: '2026-10-28T20:00', expires_at: null })).toBe('2026-10-28');
    expect(eventDay({ event_start: null, expires_at: '2026-10-29T03:59:59Z' })).toBe('2026-10-28');
    expect(eventDay({ event_start: null, expires_at: null })).toBeNull();
  });

  it('addDays e inWindow', () => {
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04');
    expect(inWindow('2026-11-03', 'week', '2026-10-28')).toBe(true);
    expect(inWindow('2026-11-04', 'week', '2026-10-28')).toBe(false);
    expect(inWindow('2026-10-28', 'upcoming', '2026-10-28')).toBe(false);
    expect(inWindow(null, 'today', '2026-10-28')).toBe(false);
  });
});
