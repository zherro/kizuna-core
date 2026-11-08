// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoraIndicaBadge, BORA_INDICA_LABEL } from './bora-indica-badge';
import { __resetLiveBoosts } from './live-boosts';

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

function stubLive(uids: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: uids.map((serviceUid) => ({ serviceUid })) }) }),
  );
}

beforeEach(() => {
  __resetLiveBoosts();
});
afterEach(() => {
  cleanup();
  __resetLiveBoosts();
  vi.unstubAllGlobals();
});

describe('BoraIndicaBadge', () => {
  it('não aparece no primeiro render (HTML do servidor/ISR nunca leva o selo)', () => {
    stubLive(['a']);
    expect(renderToString(<BoraIndicaBadge serviceUid="a" />)).toBe('');
    const { container } = render(<BoraIndicaBadge serviceUid="a" />);
    expect(container.innerHTML).toBe('');
  });

  it('aparece depois da consulta, só para anúncio com impulsionamento vivo', async () => {
    stubLive(['a']);
    render(
      <>
        <BoraIndicaBadge serviceUid="a" />
        <BoraIndicaBadge serviceUid="b" />
      </>,
    );
    await flush();
    const seals = screen.getAllByRole('img', { name: BORA_INDICA_LABEL });
    expect(seals).toHaveLength(1);
    expect(seals[0].getAttribute('title')).toBe(BORA_INDICA_LABEL);
    expect(seals[0].getAttribute('data-bora-indica')).toBe('card');
  });

  it('variante detail e sem uid', async () => {
    stubLive(['a']);
    render(
      <>
        <BoraIndicaBadge serviceUid="a" variant="detail" />
        <BoraIndicaBadge serviceUid={null} />
      </>,
    );
    await flush();
    const seals = screen.getAllByRole('img', { name: BORA_INDICA_LABEL });
    expect(seals).toHaveLength(1);
    expect(seals[0].getAttribute('data-bora-indica')).toBe('detail');
  });

  it('falha na consulta = sem selo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
    render(<BoraIndicaBadge serviceUid="a" />);
    await flush();
    expect(screen.queryByRole('img', { name: BORA_INDICA_LABEL })).toBeNull();
  });

  it('com movimento reduzido não anima', async () => {
    stubLive(['a']);
    const animate = vi.fn();
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.useFakeTimers();
    render(<BoraIndicaBadge serviceUid="a" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(animate).not.toHaveBeenCalled();
    vi.useRealTimers();
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  });
});
