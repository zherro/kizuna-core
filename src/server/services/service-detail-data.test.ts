import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T,>(b: T) => b }));

import {
  ensureServiceTaxonomy,
  fetchOrganizer,
  fetchTagRails,
  fetchLinkedRefs,
  fetchSalePoints,
  fetchVenue,
  resolveServiceRefs,
  MAX_DETAIL_TAG_RAILS,
} from './service-detail-data';
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

  it('sem extras.tags: só a busca de vinculados por uid (local_ref)', async () => {
    rpcByTag({});
    expect(await fetchTagRails(base({ extras: {} } as Partial<ServiceRecord>))).toEqual([]);
    expect(pgrstRpc).toHaveBeenCalledTimes(1);
    expect(pgrstRpc.mock.calls[0][1].p_local_refs).toEqual(['u1']);
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
    expect(bodies.map((b) => b.p_tags)).toEqual([undefined, ['local:casa'], ['vazia'], ['casas-de-festas']]);
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

describe('fetchTagRails: vinculados por extras.local_ref', () => {
  type Hit = { uid: string; event_start?: string | null };
  const calls: Array<Record<string, unknown>> = [];
  const rpc = (hits: Hit[], { failRefs = false } = {}) =>
    pgrstRpc.mockImplementation(async (...args: unknown[]) => {
      const body = args[1] as Record<string, unknown>;
      calls.push(body);
      if (failRefs && body.p_local_refs) return new Response('{}', { status: 400 });
      return new Response(JSON.stringify(hits.map((h) => ({ title: h.uid, ...h }))), { status: 200 });
    });
  beforeEach(() => {
    pgrstRpc.mockReset();
    calls.length = 0;
  });
  const svc = (extras: Record<string, unknown>) => base({ extras } as Partial<ServiceRecord>);

  it('uma chamada só: p_tags=[codigo] + p_local_refs=[uid, codigo]', async () => {
    rpc([{ uid: 'e1' }]);
    const rails = await fetchTagRails(svc({ codigo: 'casa-x' }));
    expect(rails.map((r) => [r.tag, r.title, r.items.map((i) => i.uid)])).toEqual([
      ['casa-x', 'Vinculados', ['e1']],
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].p_tags).toEqual(['casa-x']);
    expect(calls[0].p_local_refs).toEqual(['u1', 'casa-x']);
  });

  it('sem codigo: busca por uid (p_local_refs=[uid], sem p_tags) e mostra o carrossel com vinculosTitulo', async () => {
    rpc([{ uid: 'u1' }, { uid: 'e1' }]);
    const rails = await fetchTagRails(svc({ vinculosTitulo: 'Agenda' }));
    expect(rails.map((r) => [r.tag, r.title, r.items.map((i) => i.uid)])).toEqual([['u1', 'Agenda', ['e1']]]);
    expect(calls[0].p_tags).toBeUndefined();
    expect(calls[0].p_local_refs).toEqual(['u1']);
  });

  it('eventos futuros primeiro (mais próximo antes), depois o resto na ordem da RPC', async () => {
    rpc([
      { uid: 'passado', event_start: '2000-01-01T20:00' },
      { uid: 'sem-data' },
      { uid: 'longe', event_start: '2999-06-01T20:00' },
      { uid: 'perto', event_start: '2999-01-01T20:00' },
    ]);
    const rails = await fetchTagRails(svc({ codigo: 'casa-x' }));
    expect(rails[0].items.map((i) => i.uid)).toEqual(['perto', 'longe', 'passado', 'sem-data']);
  });

  it('RPC antiga (sem p_local_refs) → repete só por tag', async () => {
    rpc([{ uid: 'e1' }], { failRefs: true });
    const rails = await fetchTagRails(svc({ codigo: 'casa-x' }));
    expect(rails[0].items.map((i) => i.uid)).toEqual(['e1']);
    expect(calls).toHaveLength(2);
    expect(calls[1].p_local_refs).toBeUndefined();
  });
});

type Row = { id: string; uid: string; title: string; extras?: Record<string, unknown> };

/** PostgREST falso: responde `services` (por codigo em lote ou uid em lote) e `service_addresses`. */
function fakeDb(rows: Row[], addresses: Record<string, unknown[]> = {}) {
  serverFetchResource.mockImplementation(async (resource: string, filters: Record<string, string> = {}, opts?: { where?: Record<string, string> }) => {
    if (resource === 'service_addresses') return addresses[filters.service_id] ?? [];
    const inList = (v: string) => v.slice(4, -1).split(',');
    const codigo = opts?.where?.['extras->>codigo'];
    if (codigo) return rows.filter((r) => inList(codigo).includes(String(r.extras?.codigo)));
    const uid = opts?.where?.uid;
    if (uid?.startsWith('in.')) return rows.filter((r) => inList(uid).includes(r.uid));
    return [];
  });
}
const servicesCalls = () => serverFetchResource.mock.calls.filter((c) => c[0] === 'services');

const cuiabaCity = { ibge: '5103403', name: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso' };
const addrCuiaba = [
  { cityIbge: '5108402', city: 'Várzea Grande', state: 'MT', street: 'Rua B', isPrimary: false },
  { cityIbge: '5103403', city: 'Cuiabá', state: 'MT', street: 'Av. A', number: '10', isPrimary: true },
];

const U2 = 'dfb6753c-1495-43ca-94ab-907eb1dd9273';

describe('resolveServiceRefs', () => {
  it('resolve em lote por codigo (uma consulta) e o resto por uid (outra); chave = valor original', async () => {
    fakeDb(
      [
        { id: 'i1', uid: 'casa1', title: 'Casa', extras: { codigo: 'casa-x', images: [5] } },
        { id: 'i2', uid: U2, title: 'Teatro', extras: {} },
      ],
      { i1: addrCuiaba }
    );
    const map = await resolveServiceRefs(['Casa-X', U2, 'nada'], cuiabaCity);
    expect(map.get('Casa-X')).toEqual({
      uid: 'casa1',
      title: 'Casa',
      href: '/cuiaba-mt/anuncio/casa1',
      photo: '/api/public/storage/files/5/content',
      address: 'Av. A, 10, Cuiabá - MT',
      cityName: 'Cuiabá',
    });
    expect(map.get(U2)).toMatchObject({ uid: U2, photo: null, address: null, cityName: null, href: `/anuncios/${U2}` });
    expect(map.has('nada')).toBe(false);
    expect(servicesCalls()).toHaveLength(2);
    expect(servicesCalls()[0][2].where['extras->>codigo']).toBe(`in.(casa-x,${U2},nada)`);
    // `uid` é uuid no banco: código que sobrou fica fora do in.(...) — senão a consulta inteira falha
    expect(servicesCalls()[1][2].where.uid).toBe(`in.(${U2})`);
  });

  it('uma consulta que falha não apaga o que a outra resolveu', async () => {
    serverFetchResource.mockImplementation((_r: string, _f: unknown, opts: { where?: Record<string, string> }) =>
      opts?.where?.uid
        ? Promise.resolve([{ id: 'i2', uid: U2, title: 'Musiva', extras: {} }])
        : opts?.where
          ? Promise.reject(new Error('PostgREST 400'))
          : Promise.resolve([])
    );
    const map = await resolveServiceRefs([U2, 'casa-de-festas-cuiaba'], null);
    expect(map.get(U2)).toMatchObject({ uid: U2, title: 'Musiva' });
    expect(map.has('casa-de-festas-cuiaba')).toBe(false);
  });

  it('excludeUid nunca resolve o próprio; byUid=false não faz a segunda consulta', async () => {
    fakeDb([{ id: 'i1', uid: 'u1', title: 'Eu', extras: { codigo: 'eu' } }]);
    const map = await resolveServiceRefs(['eu', 'u1'], null, { excludeUid: 'u1', byUid: false });
    expect(map.size).toBe(0);
    expect(servicesCalls()).toHaveLength(1);
  });

  it('lista vazia: sem consulta', async () => {
    expect((await resolveServiceRefs(['', ' '], null)).size).toBe(0);
    expect(serverFetchResource).not.toHaveBeenCalled();
  });
});

describe('fetchVenue', () => {
  const svc = (extras: Record<string, unknown>) => base({ extras } as Partial<ServiceRecord>);

  it('extras.local_ref (uid) tem prioridade sobre a tag', async () => {
    fakeDb(
      [
        { id: 'il', uid: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d', title: 'Teatro', extras: { images: [5, 6] } },
        { id: 'ic', uid: 'casa1', title: 'Casa X', extras: { codigo: 'casa-x' } },
      ],
      { il: addrCuiaba }
    );
    expect(await fetchVenue(svc({ local_ref: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d', tags: ['casa-x'] }), cuiabaCity)).toEqual({
      uid: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d',
      title: 'Teatro',
      href: '/cuiaba-mt/anuncio/9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d',
      photo: '/api/public/storage/files/5/content',
      address: 'Av. A, 10, Cuiabá - MT',
      cityName: 'Cuiabá',
    });
  });

  it('local_ref inexistente/inativo: cai para a tag (codigo)', async () => {
    fakeDb([{ id: 'ic', uid: 'casa1', title: 'Casa X', extras: { codigo: 'casa-x', coverFileId: 9 } }]);
    expect(await fetchVenue(svc({ local_ref: 'sumiu', tags: ['casa-x'] }), null)).toEqual({
      uid: 'casa1',
      title: 'Casa X',
      href: '/anuncios/casa1',
      photo: '/api/public/storage/files/9/content',
      address: null,
      cityName: null,
    });
  });

  it('sem local_ref: resolve pela tag (mecanismo atual)', async () => {
    fakeDb([{ id: 'ic', uid: 'casa1', title: 'Casa X', extras: { codigo: 'casa-x' } }], { ic: addrCuiaba });
    expect(await fetchVenue(svc({ tags: ['shows', 'casa-x'] }), cuiabaCity)).toMatchObject({ uid: 'casa1', cityName: 'Cuiabá' });
  });

  it('local_ref apontando para si mesmo é ignorado; sem local → null sem consulta', async () => {
    expect(await fetchVenue(svc({ local_ref: 'u1' }), null)).toBeNull();
    expect(await fetchVenue(svc({}), null)).toBeNull();
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('erro de rede → null', async () => {
    serverFetchResource.mockRejectedValueOnce(new Error('boom'));
    expect(await fetchVenue(svc({ local_ref: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d', tags: ['x'] }), null)).toBeNull();
  });
});

describe('fetchLinkedRefs: respostas do formulário', () => {
  it('local_ref só nas respostas do formulário → venue', async () => {
    fakeDb([{ id: 'ic', uid: 'casa1', title: 'Casa X', extras: { codigo: 'casa-x' } }]);
    const svc = base({ extras: {} } as Partial<ServiceRecord>);
    const refs = await fetchLinkedRefs(svc, null, {
      schema: {} as never,
      answers: { local_ref: 'casa-x', pontos_de_venda: [{ nome: 'Disk ingresso' }] },
    });
    expect(refs.venue).toMatchObject({ uid: 'casa1', title: 'Casa X' });
    expect(refs.salePoints.map((p) => p.label)).toEqual(['Disk ingresso']);
  });

  it('extras.local_ref vence a resposta do formulário', async () => {
    fakeDb([
      { id: 'ia', uid: 'a1', title: 'A', extras: { codigo: 'casa-a' } },
      { id: 'ib', uid: 'b1', title: 'B', extras: { codigo: 'casa-b' } },
    ]);
    const svc = base({ extras: { local_ref: 'casa-a' } } as Partial<ServiceRecord>);
    const refs = await fetchLinkedRefs(svc, null, { schema: {} as never, answers: { local_ref: 'casa-b' } });
    expect(refs.venue?.uid).toBe('a1');
  });
});

describe('fetchSalePoints', () => {
  const svc = (pontos: unknown) => base({ extras: { pontos_de_venda: pontos } } as Partial<ServiceRecord>);

  it('mantém a ordem; achado → título do anúncio; não achado → humanizeSlug ou texto original', async () => {
    fakeDb([{ id: 'ic', uid: 'casa1', title: 'Casa de Festas', extras: { codigo: 'casa-de-festas-cuiaba' } }]);
    const points = await fetchSalePoints(
      svc([{ nome: 'loja-do-ze-centro' }, { nome: 'casa-de-festas-cuiaba' }, { nome: 'Bilheteria local' }, { nome: '' }]),
      null
    );
    expect(points.map((p) => p.label)).toEqual(['Loja Do Ze Centro', 'Casa de Festas', 'Bilheteria local']);
    expect(points[1].venue).toMatchObject({ uid: 'casa1', href: '/anuncios/casa1' });
    expect(points[0].venue).toBeNull();
    expect(servicesCalls()[0][2].where['extras->>codigo']).toBe('in.(loja-do-ze-centro,casa-de-festas-cuiaba)');
  });

  it('sem pontos → [] sem consulta; erro → rótulos sem venue', async () => {
    expect(await fetchSalePoints(svc(undefined), null)).toEqual([]);
    expect(serverFetchResource).not.toHaveBeenCalled();
    serverFetchResource.mockRejectedValueOnce(new Error('boom'));
    expect(await fetchSalePoints(svc([{ nome: 'casa-de-festas-cuiaba' }]), null)).toEqual([
      { label: 'Casa De Festas Cuiaba', venue: null },
    ]);
  });
});

describe('fetchSalePoints: link de compra', () => {
  it('carrega o link do item (objeto) até o ponto; sem link a chave não existe', async () => {
    fakeDb([{ id: 'ic', uid: 'casa1', title: 'Casa de Festas', extras: { codigo: 'casa-de-festas-cuiaba' } }]);
    const svc = base({
      extras: {
        pontos_de_venda: [
          { nome: 'casa-de-festas-cuiaba', link: ' https://ing.test/a ' },
          'Bilheteria',
          { nome: 'Disk ingresso', link: 'https://disk.test/e' },
          { nome: 'Sem link' },
        ],
      },
    } as Partial<ServiceRecord>);
    const points = await fetchSalePoints(svc, null);
    expect(points.map((p) => p.link)).toEqual(['https://ing.test/a', undefined, 'https://disk.test/e', undefined]);
    expect(points[0].venue).toMatchObject({ uid: 'casa1' });
    expect('link' in points[1]).toBe(false);
  });
});

describe('fetchLinkedRefs', () => {
  it('venue, pontos de venda e artistas num lote só (uma consulta por codigo + uma por uid)', async () => {
    fakeDb([
      { id: 'il', uid: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d', title: 'Teatro', extras: {} },
      { id: 'ic', uid: 'casa1', title: 'Casa de Festas', extras: { codigo: 'casa-de-festas-cuiaba' } },
      { id: 'ia', uid: 'art1', title: 'João Gomes', extras: { codigo: 'joao-gomes' } },
    ]);
    const svc = base({
      extras: {
        local_ref: '9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d',
        pontos_de_venda: [{ nome: 'casa-de-festas-cuiaba' }],
        artistas: [{ nome: 'João Gomes' }, { nome: 'Banda Desconhecida' }],
      },
    } as Partial<ServiceRecord>);
    const refs = await fetchLinkedRefs(svc, null);
    expect(refs.venue?.uid).toBe('9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d');
    expect(refs.salePoints).toEqual([{ label: 'Casa de Festas', venue: expect.objectContaining({ uid: 'casa1' }) }]);
    expect(refs.artists).toEqual([
      { label: 'João Gomes', venue: expect.objectContaining({ uid: 'art1' }) },
      { label: 'Banda Desconhecida', venue: null },
    ]);
    expect(servicesCalls()).toHaveLength(2);
    expect(servicesCalls()[0][2].where['extras->>codigo']).toBe(
      'in.(9b2c1e4a-0d3f-4a6b-8c7d-1e2f3a4b5c6d,casa-de-festas-cuiaba,joao-gomes,banda-desconhecida)'
    );
  });

  it('nada para resolver → sem consulta', async () => {
    expect(await fetchLinkedRefs(base({ extras: {} } as Partial<ServiceRecord>), null)).toEqual({
      venue: null,
      salePoints: [],
      artists: [],
    });
    expect(serverFetchResource).not.toHaveBeenCalled();
  });
});
