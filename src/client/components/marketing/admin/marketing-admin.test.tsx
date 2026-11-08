// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MarketingAdminScreen } from './marketing-admin-screen';
import { CreditSheet } from './credit-sheet';
import { resourceMarketingAdmin } from './admin-resources';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

afterEach(cleanup);

type Call = { url: string; init?: RequestInit };
let calls: Call[];
let data: Record<string, unknown[]>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const click = (el: Element) => {
  fireEvent.mouseDown(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
};

beforeEach(() => {
  calls = [];
  data = {};
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (init?.method === 'POST' || init?.method === 'PATCH') return json({ ok: true });
      const resource = url.split('/api/resources/')[1]?.split('?')[0] ?? '';
      return json({ items: data[resource] ?? [] });
    }),
  );
});

describe('CreditSheet', () => {
  function open() {
    const onDone = vi.fn();
    render(<CreditSheet open onOpenChange={() => {}} tenantId="T1" accountLabel="Pizzaria" balanceCents={1000} onDone={onDone} />);
    return onDone;
  }

  it('lança crédito só depois da confirmação, com kind e valor corretos', async () => {
    const onDone = open();
    fireEvent.change(screen.getByLabelText('Valor em reais'), { target: { value: '50,00' } });
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'Pix' } });
    click(screen.getByText('Revisar lançamento'));
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    expect(await screen.findByText('R$ 60,00')).toBeTruthy(); // saldo depois
    click(screen.getByLabelText('Confirmar lançamento'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const post = calls.find((c) => c.init?.method === 'POST')!;
    expect(post.url).toBe('/api/resources/wallet_ledger');
    expect(JSON.parse(String(post.init!.body))).toEqual({ tenantId: 'T1', kind: 'credit_admin', amountCents: 5000, note: 'Pix' });
  });

  it('correção desconta (valor negativo, kind adjust) e exige motivo', async () => {
    open();
    click(screen.getByText('Corrigir (descontar)'));
    fireEvent.change(screen.getByLabelText('Valor em reais'), { target: { value: '5' } });
    click(screen.getByText('Revisar lançamento'));
    expect(await screen.findByText('Explique a correção na observação.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'duplicado' } });
    click(screen.getByText('Revisar lançamento'));
    click(await screen.findByLabelText('Confirmar lançamento'));
    await waitFor(() => expect(calls.some((c) => c.init?.method === 'POST')).toBe(true));
    expect(JSON.parse(String(calls.find((c) => c.init?.method === 'POST')!.init!.body))).toMatchObject({ kind: 'adjust', amountCents: -500 });
  });

  it('recusa valor zero ou inválido sem chamar a API', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Valor em reais'), { target: { value: 'abc' } });
    click(screen.getByText('Revisar lançamento'));
    expect(await screen.findByText('Informe um valor maior que zero.')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

describe('MarketingAdminScreen', () => {
  it('lista anunciantes com saldo e lê tudo sem cache', async () => {
    data.vw_wallet_balance = [{ tenantId: 'tenant-abc123', balanceCents: 4200, creditedCents: 10000, committedCents: 5800 }];
    data.boosts_admin = [];
    data.ad_campaigns_admin = [];
    render(<MarketingAdminScreen />);
    expect((await screen.findAllByText('R$ 42,00')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('conta …abc123')).toBeTruthy();
    const reads = calls.filter((c) => c.url.startsWith('/api/resources/'));
    expect(reads.length).toBeGreaterThan(0);
    for (const c of reads) expect((c.init as RequestInit | undefined)?.cache).toBe('no-store');
  });

  it('banners: aprova registrando a revisão e ativando; reprova exigindo motivo', async () => {
    data.ad_creatives_review = [
      { id: 'k1', tenantId: 'T1', format: 'banner', kind: 'gif', imageUrl: '/a.gif', alt: 'a', linkUrl: 'https://loja.com/x', label: 'Promo', slots: ['cidade-topo'], active: false, createdAt: '2026-12-01T00:00:00Z' },
      { id: 'site', tenantId: null, format: 'banner', kind: 'imagem', imageUrl: '/s.png', alt: '', linkUrl: 'https://s.com', label: 'Site', slots: [], active: true, createdAt: '2026-11-01T00:00:00Z' },
    ];
    data.ad_creative_reviews = [];
    render(<MarketingAdminScreen />);
    click(await screen.findByText('Banners'));
    expect(await screen.findByText('loja.com')).toBeTruthy();
    expect(screen.queryByText('Site')).toBeNull(); // criativo do próprio site não entra na fila

    click(screen.getByText('Reprovar'));
    click(screen.getByLabelText('Confirmar reprovação'));
    expect(await screen.findByText(/Explique o motivo/)).toBeTruthy();
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);

    click(screen.getByText('Voltar'));
    click(screen.getByLabelText('Aprovar banner'));
    await waitFor(() => expect(calls.filter((c) => c.init?.method).length).toBe(2));
    const [review, activate] = calls.filter((c) => c.init?.method);
    expect(review.url).toBe('/api/resources/ad_creative_reviews');
    expect(JSON.parse(String(review.init!.body))).toMatchObject({ creativeId: 'k1', status: 'approved' });
    expect(activate.url).toBe('/api/resources/ad_creatives_review/k1');
    expect(activate.init!.method).toBe('PATCH');
    expect(JSON.parse(String(activate.init!.body))).toEqual({ active: true });
  });

  it('impulsionamentos: parar manda só stoppedOn', async () => {
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    data.boosts_admin = [
      { id: '7', serviceUid: 'u', tenantId: 'T1', dailyCents: 1000, startsOn: day(-1), endsOn: day(5), stoppedOn: null, title: 'Pizzaria do Zé' },
    ];
    data.vw_boost_metrics_daily = [];
    render(<MarketingAdminScreen />);
    click(await screen.findByText('Impulsionamentos'));
    expect(await screen.findByText('Pizzaria do Zé')).toBeTruthy();
    click(screen.getByText('Parar'));
    click(screen.getByLabelText('Confirmar parar impulsionamento'));
    await waitFor(() => expect(calls.some((c) => c.init?.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.init?.method === 'PATCH')!;
    expect(patch.url).toBe('/api/resources/boosts/7');
    expect(JSON.parse(String(patch.init!.body))).toEqual({ stoppedOn: day(1) });
  });
});

describe('resourceMarketingAdmin', () => {
  it('mapeia embeds e libera só `active` no PATCH do criativo', () => {
    expect(resourceMarketingAdmin.boosts_admin.mapOutput!({ id: 1, service_uid: 'u', tenant_id: 't', daily_cents: 500, starts_on: 'a', ends_on: 'b', services: { title: 'X' } })).toMatchObject({ title: 'X', dailyCents: 500 });
    expect(resourceMarketingAdmin.boosts_admin.mapOutput!({ id: 1, services: [{ title: 'Y' }] })).toMatchObject({ title: 'Y' });
    expect(resourceMarketingAdmin.ad_creatives_review.toggleFields).toEqual(['active']);
    expect(resourceMarketingAdmin.ad_campaigns_admin.mapOutput!({ id: 1, ad_creatives: { label: 'L', format: 'banner' } })).toMatchObject({ label: 'L', format: 'banner' });
    for (const cfg of Object.values(resourceMarketingAdmin)) expect(cfg.publicCacheSeconds).toBeUndefined();
  });
});
