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
