import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pgrstRpc } = vi.hoisted(() => ({ pgrstRpc: vi.fn() }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
// `../regions` lê o kizuna.config.json do projeto (alias `@/`) — aqui, Cuiabá + VG irmãs.
vi.mock('../regions', async () => {
  const { withRegionCities } = await import('../../shared/regions');
  return {
    withProjectRegionCities: withRegionCities([
      { key: 'grande-cuiaba', title: 'Grande Cuiabá', cities: ['5103403', '5108402'] },
    ]),
  };
});

// `../marketing/boost-config` também lê o config do projeto: padrões (listSlots 1).
vi.mock('../marketing/boost-config', async () => {
  const { DEFAULT_BOOST_PLACEMENT } = await import('../../shared/marketing/boost-placement');
  return { projectBoostPlacement: DEFAULT_BOOST_PLACEMENT };
});

import { runServiceSearch } from './service-search';

beforeEach(() => {
  pgrstRpc.mockReset();
  pgrstRpc.mockResolvedValue(new Response('[]', { status: 200 }));
});

describe('runServiceSearch', () => {
  it('cidade com irmãs → manda p_city_ibges com a selecionada primeiro', async () => {
    await runServiceSearch({ p_city_ibge: '5108402' }, 0);
    expect(pgrstRpc.mock.calls[0][1]).toMatchObject({
      p_city_ibge: '5108402',
      p_city_ibges: ['5108402', '5103403'],
    });
  });

  it('sem cidade ou cidade sem irmãs → sem p_city_ibges', async () => {
    await runServiceSearch({}, 0);
    await runServiceSearch({ p_city_ibge: '5103007' }, 0);
    expect(pgrstRpc.mock.calls[0][1]).not.toHaveProperty('p_city_ibges');
    expect(pgrstRpc.mock.calls[1][1]).not.toHaveProperty('p_city_ibges');
  });
});

describe('runServiceSearch — impulsionamento', () => {
  it('manda p_sponsored_max = listSlots por padrão; override vence', async () => {
    await runServiceSearch({}, 0);
    await runServiceSearch({ p_sponsored_max: 3 }, 0);
    expect(pgrstRpc.mock.calls[0][1]).toMatchObject({ p_sponsored_max: 1 });
    expect(pgrstRpc.mock.calls[1][1]).toMatchObject({ p_sponsored_max: 3 });
  });

  it('banco sem a search 0014 recusa a chave: repete sem ela (lista orgânica)', async () => {
    pgrstRpc
      .mockResolvedValueOnce(new Response('{"code":"PGRST202"}', { status: 404 }))
      .mockResolvedValueOnce(new Response('[{"uid":"x"}]', { status: 200 }));
    const rows = await runServiceSearch({}, 0);
    expect(rows).toEqual([{ uid: 'x' }]);
    expect(pgrstRpc).toHaveBeenCalledTimes(2);
    expect(pgrstRpc.mock.calls[1][1]).not.toHaveProperty('p_sponsored_max');
  });
});

