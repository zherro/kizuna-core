import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: <F>(fn: F) => fn }));
vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T>(b: T) => b }));

import { loadTodayFeed, localDayKey, startsOnDay } from './today-feed-data';

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
});
