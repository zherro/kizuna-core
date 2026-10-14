// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { AdsScreen } from './ads-screen';
import { AD_SLOT_CATALOG, GOOGLE_CREATIVE_ID } from '../../../shared/ads';

afterEach(cleanup);

type Call = { url: string; init?: RequestInit };
let calls: Call[];
let state: { slots: unknown[]; creatives: unknown[]; stats: unknown[] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  calls = [];
  state = { slots: [], creatives: [], stats: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === '/api/storage/files') return json({ uploaded: [{ id: 'file-9' }] });
      if (init?.method === 'POST' || init?.method === 'PATCH') return json({ ok: true });
      if (url.startsWith('/api/resources/ad_slots')) return json({ items: state.slots });
      if (url.startsWith('/api/resources/ad_creatives')) return json({ items: state.creatives });
      if (url.startsWith('/api/resources/ad_stats_daily')) return json({ items: state.stats });
      return json({}, 404);
    })
  );
});

const userEvent = {
  setup: () => ({
    click: async (el: Element) => {
      fireEvent.mouseDown(el);
      fireEvent.mouseUp(el);
      fireEvent.click(el);
    },
    upload: async (el: Element, file: File) => {
      fireEvent.change(el, { target: { files: [file] } });
    },
    selectOptions: async (el: Element, value: string) => {
      fireEvent.change(el, { target: { value } });
    },
  }),
};

const today = new Date().toISOString().slice(0, 10);
const stat = (o: Record<string, unknown>) => ({
  id: Math.random().toString(),
  slot_slug: 'home-meio',
  creative_id: 'c1',
  page: '/',
  day: today,
  impressions: 100,
  clicks: 10,
  ...o,
});

describe('AdsScreen', () => {
  it('lista todos os slugs do catálogo e salva por upsert', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    for (const s of AD_SLOT_CATALOG) {
      expect(await screen.findByText(s.label)).toBeTruthy();
    }
    await user.click(screen.getByLabelText('Habilitado home-meio'));
    await user.click(screen.getByRole('button', { name: 'Salvar home-meio' }));
    await waitFor(() => {
      const post = calls.find((c) => c.init?.method === 'POST' && c.url === '/api/resources/ad_slots');
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post!.init!.body))).toMatchObject({ slug: 'home-meio', enabled: true });
    });
  });

  it('mídia e peso alteram o payload e avisa ad unit vazio', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await screen.findByText(AD_SLOT_CATALOG[0].label);
    await user.click(screen.getByLabelText('home-meio Google'));
    await user.click(screen.getByLabelText('home-meio GIF'));
    fireEvent.change(screen.getByLabelText('Peso Google home-meio'), { target: { value: '300' } });
    expect(screen.getAllByText(/sem ad unit, o Google não será exibido/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Salvar home-meio' }));
    await waitFor(() => {
      const post = calls.find((c) => c.init?.method === 'POST' && c.url === '/api/resources/ad_slots');
      const body = JSON.parse(String(post!.init!.body));
      expect([...body.media].sort()).toEqual(['google', 'imagem']);
      expect(body.googleWeight).toBe(300);
    });
  });

  it('criativos: valida e sobe arquivo com optimizeImages conforme o tipo', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    await user.click(await screen.findByRole('button', { name: 'Novo criativo' }));
    fireEvent.change(await screen.findByLabelText('Link'), { target: { value: 'ftp://x' } });
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    expect(await screen.findByText(/Link deve começar com http/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://a.com' } });
    fireEvent.change(screen.getByLabelText('Peso'), { target: { value: '1001' } });
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    expect(await screen.findByText(/Peso deve ficar entre 0 e 1000/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Peso'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-02-10' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    expect(await screen.findByText(/Fim deve ser igual ou posterior ao início/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-02-20' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'gif' } });
    const file = new File(['x'], 'a.gif', { type: 'image/gif' });
    await user.upload(screen.getByLabelText('Arquivo'), file);
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    await waitFor(() => {
      const up = calls.find((c) => c.url === '/api/storage/files');
      expect(up).toBeTruthy();
      const form = up!.init!.body as FormData;
      expect(form.get('purpose')).toBe('banner');
      expect(form.get('optimizeImages')).toBe('false');
      const post = calls.find((c) => c.url === '/api/resources/ad_creatives' && c.init?.method === 'POST');
      expect(JSON.parse(String(post!.init!.body)).imageUrl).toBe('/api/public/storage/files/file-9/content');
    });
  });

  it('criativos: imagem sobe com optimizeImages true', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    await user.click(await screen.findByRole('button', { name: 'Novo criativo' }));
    fireEvent.change(await screen.findByLabelText('Link'), { target: { value: 'https://a.com' } });
    await user.upload(screen.getByLabelText('Arquivo'), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    await waitFor(() => {
      const up = calls.find((c) => c.url === '/api/storage/files');
      expect((up!.init!.body as FormData).get('optimizeImages')).toBe('true');
    });
  });

  it('métricas: tabelas, filtro cruzado, Google e série diária', async () => {
    const user = userEvent.setup();
    state.creatives = [
      {
        id: 'c1', label: 'Promo Verão', format: 'banner', kind: 'imagem', imageUrl: '/x',
        linkUrl: 'https://a', weight: 1, cities: [], slots: [], active: true, alt: '', startsAt: null, endsAt: null,
      },
    ];
    state.stats = [
      stat({}),
      stat({ slot_slug: 'cidade-topo', creative_id: GOOGLE_CREATIVE_ID, page: '/cuiaba', impressions: 50, clicks: 0 }),
    ];
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Métricas' }));
    expect(await screen.findByText('Google (só impressões)')).toBeTruthy();
    expect(screen.getByText('Promo Verão')).toBeTruthy();
    expect(screen.getByLabelText('Série diária')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Período'), '7');
    await waitFor(() => expect(calls.filter((c) => c.url.includes('ad_stats_daily')).length).toBeGreaterThan(1));
    await user.click(await screen.findByRole('button', { name: 'Filtrar slot cidade-topo' }));
    expect(screen.queryByText('Promo Verão')).toBeNull();
    expect(screen.getByText('Google (só impressões)')).toBeTruthy();
  });

  it('estado vazio nas métricas', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Métricas' }));
    expect(await screen.findByText('Sem dados no período')).toBeTruthy();
  });

  it('avisa quando AdSense não configurado', async () => {
    render(<AdsScreen adsenseConfigured={false} />);
    expect(await screen.findByText(/AdSense não configurado/)).toBeTruthy();
  });

  it('vigência: ida e volta sem deslocar o dia', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    await user.click(await screen.findByRole('button', { name: 'Novo criativo' }));
    fireEvent.change(await screen.findByLabelText('Link'), { target: { value: 'https://a.com' } });
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-03-05' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-03-10' } });
    await user.upload(screen.getByLabelText('Arquivo'), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    let payload: { startsAt: string; endsAt: string } | undefined;
    await waitFor(() => {
      const post = calls.find((c) => c.url === '/api/resources/ad_creatives' && c.init?.method === 'POST');
      expect(post).toBeTruthy();
      payload = JSON.parse(String(post!.init!.body));
    });
    expect(new Date(payload!.startsAt).getTime()).toBe(new Date('2026-03-05T00:00:00.000').getTime());
    expect(new Date(payload!.endsAt).getTime()).toBe(new Date('2026-03-10T23:59:59.999').getTime());
    cleanup();
    state.creatives = [
      {
        id: 'c1', label: 'Vig', format: 'banner', kind: 'imagem', imageUrl: '/x', linkUrl: 'https://a',
        weight: 1, cities: [], slots: [], active: true, alt: '', ...payload,
      },
    ];
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    await user.click(await screen.findByRole('button', { name: 'c1' }));
    expect(((await screen.findByLabelText('Início')) as HTMLInputElement).value).toBe('2026-03-05');
    expect((screen.getByLabelText('Fim') as HTMLInputElement).value).toBe('2026-03-10');
  });

  it('criativos: pagina a listagem (2 páginas)', async () => {
    const mk = (i: number) => ({
      id: `id${i}`, label: `Cri ${i}`, format: 'banner', kind: 'imagem', imageUrl: '/x', linkUrl: 'https://a',
      weight: 1, cities: [], slots: [], active: true, alt: '', startsAt: null, endsAt: null,
    });
    const user = userEvent.setup();
    const base = globalThis.fetch as unknown as (u: string, i?: RequestInit) => Promise<Response>;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: RequestInfo | URL, i?: RequestInit) => {
        const url = String(u);
        if (url.startsWith('/api/resources/ad_creatives') && url.includes('page=1')) {
          return json({ items: Array.from({ length: 200 }, (_, k) => mk(k)) });
        }
        if (url.startsWith('/api/resources/ad_creatives') && url.includes('page=2')) {
          return json({ items: [mk(900)] });
        }
        return base(url, i);
      })
    );
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    expect(await screen.findByText('Cri 900')).toBeTruthy();
  });

  it('criativos: kind x arquivo', async () => {
    const user = userEvent.setup();
    render(<AdsScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Criativos' }));
    await user.click(await screen.findByRole('button', { name: 'Novo criativo' }));
    fireEvent.change(await screen.findByLabelText('Link'), { target: { value: 'https://a.com' } });
    await user.upload(screen.getByLabelText('Arquivo'), new File(['x'], 'a.gif', { type: 'image/gif' }));
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    expect(await screen.findByText(/Arquivo GIF: escolha o tipo gif/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'gif' } });
    await user.upload(screen.getByLabelText('Arquivo'), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Salvar criativo' }));
    expect(await screen.findByText(/Tipo GIF exige um arquivo/)).toBeTruthy();
    expect(calls.some((c) => c.url === '/api/storage/files')).toBe(false);
  });
});
