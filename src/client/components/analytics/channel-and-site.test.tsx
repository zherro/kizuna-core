// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelBreakdown } from './channel-breakdown';
import { SiteVisitorsSection } from './site-visitors';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChannelBreakdown', () => {
  it('mostra canais em pt-BR com cliques e percentual', () => {
    render(
      <ChannelBreakdown
        items={[
          { channel: 'whatsapp', contacts: 3, share: 60 },
          { channel: 'purchase', contacts: 1, share: 20 },
          { channel: 'unknown', contacts: 1, share: 20 },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Cliques por canal' })).toBeTruthy();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items[0].textContent).toContain('WhatsApp');
    expect(items[0].textContent).toContain('3 cliques');
    expect(items[1].textContent).toContain('Compra de ingresso');
    expect(items[1].textContent).toContain('1 clique');
    expect(items[2].textContent).toContain('Não registrado');
  });
});

describe('SiteVisitorsSection', () => {
  it('chama a RPC agregada com o período e mostra visitantes por origem (sem UTM = Direto)', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        items: [
          { dimension: 'total', key: '', visitors: 4, pages: 9 },
          { dimension: 'source', key: 'instagram', visitors: 3, pages: 7 },
          { dimension: 'source', key: '', visitors: 1, pages: 2 },
          { dimension: 'campaign', key: '', visitors: 4, pages: 9 },
          { dimension: 'city', key: 'cuiaba-mt', visitors: 4, pages: 9 },
          { dimension: 'device', key: 'mobile', visitors: 4, pages: 9 },
        ],
      })
    );
    render(<SiteVisitorsSection days={7} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Visitantes por origem' })).toBeTruthy());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/resources/fn_analytics_page_view_summary');
    const body = JSON.parse(init.body as string);
    expect(body.p_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.p_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const items = within(screen.getByRole('list', { name: 'Visitantes por origem' })).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Instagram');
    expect(items[0].textContent).toContain('3 visitantes');
    expect(items[0].textContent).toContain('75%');
    expect(items[1].textContent).toContain('Direto');
    expect(screen.getByRole('list', { name: 'Visitantes por cidade' }).textContent).toContain('Cuiaba/MT');
    expect(screen.getByRole('list', { name: 'Visitantes por aparelho' }).textContent).toContain('Celular');
    // só "sem campanha": o bloco de campanha não aparece
    expect(screen.queryByRole('list', { name: 'Visitantes por campanha' })).toBeNull();
  });

  it('erro da RPC mostra aviso sem quebrar', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    render(<SiteVisitorsSection days={30} />);
    await waitFor(() => expect(screen.getByText('Não foi possível carregar as visitas do site.')).toBeTruthy());
  });
});
