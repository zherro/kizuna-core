import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T,>(b: T) => b }));

import { ensureServiceTaxonomy, fetchOrganizer, fetchTagRails, MAX_DETAIL_TAG_RAILS } from './service-detail-data';
import type { ServiceRecord } from '../../client/components/services/service-type';

const base = (over: Partial<ServiceRecord> = {}) =>
  ({
    id: '1',
    uid: 'u1',
    title: 'Show',
    categoryId: '7',
    categoryGroupId: null,
    categoryGroup: null,
    category: { id: '7', name: 'Shows', slug: 'shows' },
    ...over,
  }) as ServiceRecord;

beforeEach(() => serverFetchResource.mockReset());

describe('ensureServiceTaxonomy', () => {
  it('não busca nada quando categoria e grupo já têm slug', async () => {
    const svc = base({ categoryGroup: { id: '2', name: 'Eventos', slug: 'eventos' } });
    await ensureServiceTaxonomy(svc);
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('deriva o grupo pela categoria quando services.category_group_id é nulo', async () => {
    serverFetchResource
      .mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: 2 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Eventos', slug: 'eventos', active: true }]);
    const svc = await ensureServiceTaxonomy(base());

    expect(serverFetchResource).toHaveBeenNthCalledWith(
      1,
      'categories_public',
      { id: '7' },
      expect.objectContaining({ auth: null })
    );
    expect(serverFetchResource).toHaveBeenNthCalledWith(
      2,
      'categories_group',
      { id: '2' },
      expect.objectContaining({ auth: null })
    );
    expect(svc.categoryGroup).toMatchObject({ id: '2', name: 'Eventos', slug: 'eventos' });
    expect(svc.categoryGroupId).toBe('2');
  });

  it('completa o slug da categoria quando o embed veio sem ele', async () => {
    serverFetchResource
      .mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: 2 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Eventos', slug: 'eventos' }]);
    const svc = await ensureServiceTaxonomy(base({ category: { id: '7', name: 'Shows' } }));
    expect(svc.category?.slug).toBe('shows');
    expect(svc.category?.name).toBe('Shows');
  });

  it('mantém o anúncio intacto quando a categoria não tem grupo ou o recurso falha', async () => {
    serverFetchResource.mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: null }]);
    const a = await ensureServiceTaxonomy(base());
    expect(a.categoryGroup).toBeNull();

    serverFetchResource.mockRejectedValueOnce(new Error('boom'));
    const b = await ensureServiceTaxonomy(base());
    expect(b.categoryGroup).toBeNull();
  });
});

describe('fetchTagRails', () => {
  const rpcByTag = (byTag: Record<string, string[]>) =>
    pgrstRpc.mockImplementation(async (...args: unknown[]) => {
      const body = args[1] as { p_tags?: string[] } | undefined;
      const uids = byTag[body?.p_tags?.[0] ?? ''] ?? [];
      return new Response(JSON.stringify(uids.map((uid) => ({ uid, title: uid }))), { status: 200 });
    });

  beforeEach(() => pgrstRpc.mockReset());

  it('sem extras.tags não chama a RPC', async () => {
    expect(await fetchTagRails(base({ extras: {} } as Partial<ServiceRecord>))).toEqual([]);
    expect(pgrstRpc).not.toHaveBeenCalled();
  });

  it('local:* primeiro, no máximo 2, sem o próprio e sem repetir card; tag vazia é pulada', async () => {
    rpcByTag({
      'local:casa': ['u1', 'e1', 'e2'],
      vazia: ['u1'],
      'casas-de-festas': ['e2', 'c1'],
      outra: ['o1'],
    });
    const rails = await fetchTagRails(
      base({ extras: { tags: ['vazia', 'casas-de-festas', 'Local:Casa', 'outra'] } } as Partial<ServiceRecord>)
    );

    expect(MAX_DETAIL_TAG_RAILS).toBe(2);
    expect(rails.map((r) => [r.tag, r.title, r.items.map((i) => i.uid)])).toEqual([
      ['local:casa', 'Neste local', ['e1', 'e2']],
      ['casas-de-festas', 'Mais em Casas de festas', ['c1']],
    ]);
    const bodies = pgrstRpc.mock.calls.map((c) => c[1]);
    expect(bodies.map((b) => b.p_tags)).toEqual([['local:casa'], ['vazia'], ['casas-de-festas']]);
  });
});

describe('fetchOrganizer', () => {
  const event = (tags: string[]) => base({ extras: { tags } } as Partial<ServiceRecord>);
  const page = (uid: string, title: string, codigo: string) => ({ id: `id-${uid}`, uid, title, extras: { codigo } });
  const cuiaba = { ibge: '5103403', name: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso' };

  it('sem tags (ou só tags de formato inválido) não consulta nada', async () => {
    expect(await fetchOrganizer(base({ extras: {} } as Partial<ServiceRecord>), cuiaba)).toBeNull();
    expect(await fetchOrganizer(event(['a b', 'x,y']), cuiaba)).toBeNull();
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('acha o organizador por extras->>codigo (tags normalizadas), exclui o próprio e monta o link da cidade', async () => {
    serverFetchResource
      .mockResolvedValueOnce([page('casa1', 'Casa X', 'casa-x')])
      .mockResolvedValueOnce([{ cityIbge: '5103403', city: 'Cuiabá', state: 'MT' }]);
    const org = await fetchOrganizer(event([' Casa-X ', 'shows']), cuiaba);

    expect(org).toEqual({ uid: 'casa1', title: 'Casa X', href: '/cuiaba-mt/anuncio/casa1' });
    expect(serverFetchResource).toHaveBeenNthCalledWith(
      1,
      'services',
      { active: 'true', status: 'active' },
      expect.objectContaining({
        auth: null,
        orderBy: 'created_at',
        orderDirection: 'asc',
        where: { 'extras->>codigo': 'in.(casa-x,shows)', uid: 'neq.u1' },
      })
    );
  });

  it('ignora o próprio serviço mesmo se vier na resposta', async () => {
    serverFetchResource.mockResolvedValueOnce([page('u1', 'Show', 'casa-x')]);
    expect(await fetchOrganizer(event(['casa-x']), null)).toBeNull();
  });

  it('várias tags: vence a primeira da lista do anúncio que tem página', async () => {
    serverFetchResource
      .mockResolvedValueOnce([page('p-b', 'Página B', 'b'), page('p-c', 'Página C', 'c')])
      .mockResolvedValueOnce([]);
    const org = await fetchOrganizer(event(['a', 'c', 'b']), null);
    expect(org).toMatchObject({ uid: 'p-c', title: 'Página C', href: '/anuncios/p-c' });
  });

  it('usa cidade/UF do endereço da página quando não é a cidade do evento', async () => {
    serverFetchResource
      .mockResolvedValueOnce([page('casa1', 'Casa X', 'x')])
      .mockResolvedValueOnce([{ cityIbge: '5108402', city: 'Várzea Grande', state: 'MT' }]);
    expect((await fetchOrganizer(event(['x']), cuiaba))?.href).toBe('/varzea-grande-mt/anuncio/casa1');
  });

  it('serviço só com codigo e sem tags: sem consulta (nada a procurar)', async () => {
    expect(await fetchOrganizer(base({ extras: { codigo: 'casa-x' } } as Partial<ServiceRecord>), null)).toBeNull();
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('codigo igual a uma das próprias tags: não linka para si (uid neq + filtro defensivo)', async () => {
    serverFetchResource.mockResolvedValueOnce([page('u1', 'Casa X', 'casa-x')]);
    const svc = base({ extras: { codigo: 'casa-x', tags: ['casa-x'] } } as Partial<ServiceRecord>);
    expect(await fetchOrganizer(svc, null)).toBeNull();
    expect(serverFetchResource.mock.calls[0][2].where.uid).toBe('neq.u1');
  });

  it('página pausada/arquivada não vem da consulta (active+status) → sem organizador', async () => {
    serverFetchResource.mockResolvedValueOnce([]);
    expect(await fetchOrganizer(event(['casa-x']), null)).toBeNull();
    expect(serverFetchResource.mock.calls[0][1]).toEqual({ active: 'true', status: 'active' });
  });

  it('nenhuma página → null', async () => {
    serverFetchResource.mockResolvedValue([]);
    expect(await fetchOrganizer(event(['a']), null)).toBeNull();
  });

  it('erro de rede → null', async () => {
    serverFetchResource.mockRejectedValueOnce(new Error('boom'));
    expect(await fetchOrganizer(event(['a']), null)).toBeNull();
  });
});

describe('fetchTagRails: vinculados (extras.codigo)', () => {
  const rpcByTag = (byTag: Record<string, string[]>) =>
    pgrstRpc.mockImplementation(async (...args: unknown[]) => {
      const body = args[1] as { p_tags?: string[] } | undefined;
      const uids = byTag[body?.p_tags?.[0] ?? ''] ?? [];
      return new Response(JSON.stringify(uids.map((uid) => ({ uid, title: uid }))), { status: 200 });
    });
  beforeEach(() => pgrstRpc.mockReset());
  const svc = (extras: Record<string, unknown>) => base({ extras } as Partial<ServiceRecord>);

  it('com codigo e sem tags: lista vinculados (p_tags=[codigo]) sem o próprio, título "Vinculados"', async () => {
    rpcByTag({ 'casa-x': ['u1', 'e1', 'e2'] });
    const rails = await fetchTagRails(svc({ codigo: 'Casa-X' }));
    expect(rails.map((r) => [r.tag, r.title, r.items.map((i) => i.uid)])).toEqual([
      ['casa-x', 'Vinculados', ['e1', 'e2']],
    ]);
    expect(pgrstRpc.mock.calls[0][1].p_tags).toEqual(['casa-x']);
  });

  it('vinculosTitulo vale; vem ANTES das tags compartilhadas, que não repetem card; fora do limite de 2', async () => {
    rpcByTag({ 'casa-x': ['e1'], t1: ['e1', 'a1'], t2: ['b1'], t3: ['c1'] });
    const rails = await fetchTagRails(svc({ codigo: 'casa-x', vinculosTitulo: ' Agenda ', tags: ['t1', 't2', 't3'] }));
    expect(rails.map((r) => [r.title, r.items.map((i) => i.uid)])).toEqual([
      ['Agenda', ['e1']],
      ['Mais em T1', ['a1']],
      ['Mais em T2', ['b1']],
    ]);
  });

  it('vinculosTitulo em branco ou longo demais → "Vinculados"', async () => {
    rpcByTag({ 'casa-x': ['e1'] });
    expect((await fetchTagRails(svc({ codigo: 'casa-x', vinculosTitulo: '   ' })))[0].title).toBe('Vinculados');
    expect((await fetchTagRails(svc({ codigo: 'casa-x', vinculosTitulo: 'y'.repeat(61) })))[0].title).toBe('Vinculados');
  });

  it('codigo nas próprias tags: um carrossel só (vinculados), sem listar a si mesmo', async () => {
    rpcByTag({ 'casa-x': ['u1', 'e1'] });
    const rails = await fetchTagRails(svc({ codigo: 'casa-x', tags: ['casa-x'] }));
    expect(rails).toHaveLength(1);
    expect(rails[0].items.map((i) => i.uid)).toEqual(['e1']);
    expect(pgrstRpc).toHaveBeenCalledTimes(1);
  });

  it('só tags (sem codigo): comportamento anterior; sem vinculados não há carrossel', async () => {
    rpcByTag({ t1: ['a1'] });
    const rails = await fetchTagRails(svc({ tags: ['t1'] }));
    expect(rails.map((r) => r.title)).toEqual(['Mais em T1']);
    pgrstRpc.mockReset();
    rpcByTag({});
    expect(await fetchTagRails(svc({ codigo: 'vazio' }))).toEqual([]);
  });
});
