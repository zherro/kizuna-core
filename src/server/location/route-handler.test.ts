import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouteHandler } from './route-handler';

const req = (qs: string) => new Request(`http://x/api/location/route?${qs}`);
const osrm = (distance: number, duration: number) =>
  new Response(JSON.stringify({ code: 'Ok', routes: [{ distance, duration }] }), { status: 200 });

describe('createRouteHandler', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('400 com coordenadas inválidas', async () => {
    const GET = createRouteHandler({ fetchImpl: vi.fn() });
    expect((await GET(req('from=abc&to=-15.6,-56.1'))).status).toBe(400);
    expect((await GET(req('from=-15.6,-56.1'))).status).toBe(400);
  });

  it('devolve percurso do OSRM e arredonda a origem', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('routed-foot') ? osrm(2100, 1560) : osrm(2800, 420)
    );
    const GET = createRouteHandler({ fetchImpl });
    const res = await GET(req('from=-15.60149,-56.09951&to=-15.59,-56.1'));
    const body = await res.json();
    expect(body).toEqual({ approx: false, foot: { km: 2.1, minutes: 26 }, car: { km: 2.8, minutes: 7 } });
    expect(fetchImpl.mock.calls[0][0]).toContain('-56.1,-15.601;');
  });

  it('cache por origem arredondada', async () => {
    const fetchImpl = vi.fn(async () => osrm(1000, 600));
    const GET = createRouteHandler({ fetchImpl });
    await GET(req('from=-15.6011,-56.1&to=-15.5,-56'));
    await GET(req('from=-15.6012,-56.1&to=-15.5,-56'));
    expect(fetchImpl).toHaveBeenCalledTimes(2); // 2 perfis, 1 vez só
  });

  it('falha do serviço vira estimativa approx', async () => {
    const GET = createRouteHandler({ fetchImpl: vi.fn(async () => new Response('x', { status: 503 })) });
    const body = await (await GET(req('from=0,0&to=0.01,0'))).json();
    expect(body.approx).toBe(true);
    expect(body.foot.km).toBeGreaterThan(1.4);
  });
});
