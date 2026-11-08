// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvertiserPanel } from './advertiser-panel';
import { checkTopup } from './wallet-tab';

type Json = Record<string, unknown>;
const calls: Array<{ url: string; init?: RequestInit }> = [];

function page(items: unknown[]) {
  return { ok: true, json: async () => ({ items, page: 1, pageSize: 20, total: items.length, totalPages: 1 }) };
}

function stubApi(routes: Record<string, unknown[]>, extra?: (url: string, init?: RequestInit) => Json | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const custom = extra?.(url, init);
      if (custom) return { ok: true, json: async () => custom };
      const name = url.split('/api/resources/')[1]?.split('?')[0] ?? '';
      return page(routes[name] ?? []);
    }),
  );
}

beforeEach(() => {
  calls.length = 0;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('checkTopup', () => {
  it('valida valor mínimo e formato', () => {
    expect(checkTopup('50,00')).toEqual({ ok: true, cents: 5000 });
    expect(checkTopup('5,00').ok).toBe(false);
    expect(checkTopup('abc').ok).toBe(false);
  });
});

describe('AdvertiserPanel', () => {
  it('mostra o saldo da conta e consulta sem cache', async () => {
    stubApi({
      vw_wallet_balance: [{ tenantId: 't', balanceCents: 12345, creditedCents: 20000, committedCents: 7655 }],
    });
    render(<AdvertiserPanel tenantId="t" />);
    await waitFor(() => expect(screen.getAllByText(/123,45/).length).toBeGreaterThan(0));
    expect(calls.every((c) => (c.init as RequestInit & { cache?: string })?.cache === 'no-store' || c.init?.method)).toBe(true);
    expect(calls.some((c) => c.url.includes('vw_wallet_balance') && c.url.includes('filter.tenant_id=t'))).toBe(true);
  });

  it('extrato vazio orienta o próximo passo', async () => {
    stubApi({ vw_wallet_balance: [] });
    render(<AdvertiserPanel tenantId="t" />);
    expect(await screen.findByText('Nenhuma movimentação ainda')).toBeTruthy();
  });

  it('abre o pagamento: sem url mostra as instruções do provedor', async () => {
    stubApi({ vw_wallet_balance: [] }, (url) =>
      url === '/api/marketing/checkout' ? { intentId: 'i1', status: 'pending', instructions: 'Pague pelo Pix enviado por e-mail.' } : null,
    );
    render(<AdvertiserPanel tenantId="t" />);
    await screen.findByText('Adicionar saldo');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ir para o pagamento/ }));
    });
    expect(await screen.findByText(/Pague pelo Pix/)).toBeTruthy();
    const post = calls.find((c) => c.url === '/api/marketing/checkout');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ amountCents: 5000 });
  });
});
