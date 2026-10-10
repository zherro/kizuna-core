import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource } = vi.hoisted(() => ({ serverFetchResource: vi.fn() }));
vi.mock('../postgrest-crud', () => ({ serverFetchResource }));

import { fetchServiceSiblings } from './service-siblings';

const regions = [{ key: 'grande-cuiaba', title: 'Grande Cuiabá', cities: ['5103403', '5108402'] }];
const duna = {
  id: '10',
  uid: 'u-cba',
  extras: { origem: { fonte: 'ingresso.com', id_filme: '999' } },
};

beforeEach(() => serverFetchResource.mockReset());

describe('fetchServiceSiblings', () => {
  it('acha o mesmo filme nas irmãs pelos recursos services + service_addresses', async () => {
    serverFetchResource
      .mockResolvedValueOnce([{ id: '20', uid: 'u-vg', title: 'Duna' }])
      .mockResolvedValueOnce([
        { serviceId: 20, cityIbge: '5108402', city: 'Várzea Grande', state: 'MT', label: 'Cineflix VG' },
        { serviceId: 20, cityIbge: '5108402', city: 'Várzea Grande', state: 'MT', label: 'Cinépolis VG' },
      ]);

    expect(await fetchServiceSiblings(duna, '5103403', regions)).toEqual([
      {
        uid: 'u-vg',
        title: 'Duna',
        city: 'Várzea Grande',
        state: 'MT',
        cityIbge: '5108402',
        places: ['Cineflix VG', 'Cinépolis VG'],
      },
    ]);

    const [res1, filters1, opts1] = serverFetchResource.mock.calls[0];
    expect(res1).toBe('services');
    expect(filters1).toMatchObject({
      active: 'true',
      status: 'active',
      'extras->origem->>id_filme': '999',
      'extras->origem->>fonte': 'ingresso.com',
    });
    expect(opts1.auth).toBeNull();
    expect(opts1.where.uid).toBe('neq.u-cba');
    expect(opts1.where.or).toMatch(/^\(expires_at\.is\.null,expires_at\.gt\./);

    const [res2, filters2, opts2] = serverFetchResource.mock.calls[1];
    expect(res2).toBe('service_addresses');
    expect(filters2).toEqual({ active: 'true' });
    expect(opts2.where).toEqual({ service_id: 'in.(20)', city_ibge: 'in.(5108402)' });
  });

  it('sem irmãs, sem origem ou sem cidade → [] sem consultar', async () => {
    expect(await fetchServiceSiblings(duna, '5103007', regions)).toEqual([]);
    expect(await fetchServiceSiblings(duna, null, regions)).toEqual([]);
    expect(await fetchServiceSiblings({ ...duna, extras: {} }, '5103403', regions)).toEqual([]);
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('filme sem post nas irmãs (ou post sem endereço lá) → []', async () => {
    serverFetchResource.mockResolvedValueOnce([]);
    expect(await fetchServiceSiblings(duna, '5103403', regions)).toEqual([]);

    serverFetchResource.mockResolvedValueOnce([{ id: '20', uid: 'u-vg', title: 'Duna' }]);
    serverFetchResource.mockResolvedValueOnce([]);
    expect(await fetchServiceSiblings(duna, '5103403', regions)).toEqual([]);
  });

  it('erro na consulta → []', async () => {
    serverFetchResource.mockRejectedValueOnce(new Error('rede'));
    expect(await fetchServiceSiblings(duna, '5103403', regions)).toEqual([]);
  });
});
